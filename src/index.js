import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getSubTasksData', async (req) => {
  // Initial logging
  console.log('\n=== Starting getSubTasksData resolver ===');
  console.log('Full request:', JSON.stringify(req, null, 2));
  
  // Extract issue key from the extension context
  const issueKey = req.context.extension?.request?.key;
  console.log(`\n[1] Request Processing`);
  console.log(`→ Processing request for issue: ${issueKey}`);

  if (!issueKey) {
    console.error('✗ No issueKey found in extension context');
    return {
      success: false,
      error: 'No issue key found in request context'
    };
  }
  console.log(`✓ Issue key found: ${issueKey}`);

  try {
    // Fetch the Service Management issue
    console.log(`\n[2] Fetching Service Management Issue`);
    console.log(`→ Requesting issue data for: ${issueKey}`);
    
    const issueResponse = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=issuelinks,project,subtasks`
    );

    if (!issueResponse.ok) {
      const errorBody = await issueResponse.text();
      console.error(`✗ Failed to get issue ${issueKey}. Status: ${issueResponse.status}`);
      console.error(`Error details: ${errorBody}`);
      return {
        success: false,
        error: `Failed to get issue (${issueResponse.status}): ${errorBody}`,
      };
    }

    const issueData = await issueResponse.json();
    console.log(`✓ Successfully fetched issue: ${issueKey}`);
    console.log(`→ Issue links found: ${issueData.fields.issuelinks.length}`);
    console.log('Issue links:', JSON.stringify(issueData.fields.issuelinks, null, 2));

    // Find linked Software issues
    console.log(`\n[3] Processing Linked Issues`);
    const linkedIssues = issueData.fields.issuelinks.filter(link => {
      const linkedIssueKey = link.outwardIssue?.key || link.inwardIssue?.key;
      // Update the check to handle different JSW project key formats
      const isJSW = linkedIssueKey && (
        linkedIssueKey.startsWith('JSW-') || 
        linkedIssueKey.startsWith('JSW2-') ||
        linkedIssueKey.includes('JSW')
      );
      console.log(`→ Checking link: ${linkedIssueKey} (is JSW: ${isJSW})`);
      return isJSW;
    });

    if (linkedIssues.length === 0) {
      console.error(`✗ No JSW issues found in ${issueData.fields.issuelinks.length} links`);
      return {
        success: false,
        error: 'No linked Software issues found'
      };
    }

    console.log(`✓ Found ${linkedIssues.length} JSW issue(s)`);
    linkedIssues.forEach(link => {
      const key = link.outwardIssue?.key || link.inwardIssue?.key;
      console.log(`  → JSW Issue: ${key}`);
    });

    // Get subtasks from linked Software issues
    console.log(`\n[4] Fetching Subtasks`);
    const subtasksPromises = linkedIssues.map(async (linkedIssue) => {
      const softwareIssueKey = linkedIssue.outwardIssue?.key || linkedIssue.inwardIssue?.key;
      console.log(`\n→ Processing JSW issue: ${softwareIssueKey}`);

      // Update the software issue fetch to include more fields
      const softwareIssueResponse = await api.asApp().requestJira(
        route`/rest/api/3/issue/${softwareIssueKey}?fields=subtasks,summary,status,issuelinks,project&expand=subtasks`
      );

      if (!softwareIssueResponse.ok) {
        console.error(`✗ Failed to fetch JSW issue: ${softwareIssueKey}`);
        return [];
      }

      const softwareIssueData = await softwareIssueResponse.json();
      console.log(`✓ Fetched JSW issue: ${softwareIssueKey}`);
      console.log('Software issue data:', JSON.stringify(softwareIssueData, null, 2));

      // For company-managed projects, subtasks are directly in the subtasks field
      const subtasks = softwareIssueData.fields?.subtasks || [];
      console.log(`→ Found ${subtasks.length} subtasks in ${softwareIssueKey}`);

      if (subtasks.length === 0) {
        console.log(`✗ No subtasks found in ${softwareIssueKey}`);
        return [];
      }

      // Fetch complete data for each subtask
      return Promise.all(
        subtasks.map(async (subtask) => {
          try {
            console.log(`→ Fetching subtask details: ${subtask.key}`);
            const response = await api.asApp().requestJira(
              route`/rest/api/3/issue/${subtask.key}?fields=summary,status,description,assignee,issuetype,priority,comment&expand=renderedFields,comments`
            );
            
            if (!response.ok) {
              console.error(`✗ Failed to fetch subtask ${subtask.key}: ${response.status}`);
              return subtask;
            }

            // Update the subtask processing section in getSubTasksData resolver
            const subtaskData = await response.json();
            console.log(`✓ Successfully fetched subtask ${subtask.key}: ${subtaskData.fields?.summary}`);
            console.log(`→ Comments found: ${subtaskData.fields?.comment?.comments?.length || 0}`);

            // Update the comments processing in the getSubTasksData resolver:
            if (subtaskData.fields?.comment?.comments) {
              console.log("Processing comments for subtask:", subtask.key);
              
              // Log the first comment raw data to see all available fields
              if (subtaskData.fields.comment.comments.length > 0) {
                console.log("Raw first comment data:", JSON.stringify(subtaskData.fields.comment.comments[0], null, 2));
              }
              
              subtaskData.comments = subtaskData.fields.comment.comments.map(comment => {
                // Try to find the avatar URL from the author object
                const authorData = comment.author;
                let avatarUrl = null;
                
                // Check for avatarUrls object with different sizes (common in Jira Cloud)
                if (authorData.avatarUrls) {
                  avatarUrl = authorData.avatarUrls['48x48'] || 
                             authorData.avatarUrls['32x32'] || 
                             authorData.avatarUrls['24x24'] || 
                             authorData.avatarUrls['16x16'];
                }
                
                // Fallback to avatar property if available
                if (!avatarUrl && authorData.avatar) {
                  avatarUrl = authorData.avatar;
                }
                
                console.log(`Author ${authorData.displayName} avatar URL:`, avatarUrl);
                
                return {
                  id: comment.id,
                  body: comment.body,
                  bodyText: extractTextFromADF(comment.body),
                  created: comment.created,
                  updated: comment.updated,
                  author: {
                    accountId: authorData.accountId,
                    displayName: authorData.displayName,
                    avatarUrl: avatarUrl
                  }
                };
              });
              
              // Log the first processed comment to verify structure
              if (subtaskData.comments.length > 0) {
                console.log("Sample processed comment:", JSON.stringify(subtaskData.comments[0], null, 2));
              }
            }

            return subtaskData;
          } catch (err) {
            console.error(`✗ Error fetching subtask ${subtask.key}:`, err);
            return subtask;
          }
        })
      );
    });

    const allSubtasks = await Promise.all(subtasksPromises);
    const flattenedSubtasks = allSubtasks.flat();

    console.log(`\n=== Final Results ===`);
    console.log(`✓ Total subtasks found: ${flattenedSubtasks.length}`);
    if (flattenedSubtasks.length > 0) {
      console.log('Subtasks:', flattenedSubtasks.map(st => 
        `${st.key} (${st.fields?.status?.name})`
      ).join(', '));
    }

    return {
      success: true,
      subTasks: flattenedSubtasks
    };

  } catch (error) {
    console.error('\n✗ Error in getSubTasksData:', error);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
});

// Helper function to extract text from ADF
function extractTextFromADF(adf) {
  let text = '';
  
  if (!adf || !adf.content) return text;
  
  // Process each content block
  for (const block of adf.content) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      if (block.content) {
        // Process paragraph/heading content
        for (const item of block.content) {
          if (item.type === 'text') {
            text += item.text || '';
          } else if (item.type === 'mention') {
            text += `@${item.attrs?.text || ''}`;
          } else if (item.type === 'emoji') {
            text += item.attrs?.shortName || '';
          } else if (item.type === 'hardBreak') {
            text += '\n';
          }
        }
        text += '\n';
      }
    } else if (block.type === 'bulletList' || block.type === 'orderedList') {
      // Process lists
      if (block.content) {
        for (const listItem of block.content) {
          if (listItem.type === 'listItem' && listItem.content) {
            for (const itemContent of listItem.content) {
              if (itemContent.content) {
                for (const innerItem of itemContent.content) {
                  if (innerItem.type === 'text') {
                    text += `• ${innerItem.text || ''}\n`;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return text;
}

// Update the addComment resolver
resolver.define('addComment', async (req) => {
  const { issueKey, comment } = req.payload;
  const userAccountId = req.context.accountId; // Get the user's account ID from context
  
  try {
    console.log(`Adding comment to ${issueKey} as user ${userAccountId}`);
    
    // Use asUser() instead of asApp() to post comment as the current user
    const response = await api.asUser().requestJira(
      route`/rest/api/3/issue/${issueKey}/comment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: comment
                  }
                ]
              }
            ]
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to add comment: ${errorText}`);
      throw new Error(`Failed to add comment: ${response.status}`);
    }
    
    const commentData = await response.json();
    console.log(`✓ Successfully added comment to ${issueKey}`);
    
    return {
      success: true,
      comment: commentData
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Upload attachment to an issue
resolver.define('uploadAttachment', async (req) => {
  const { issueKey, fileName, fileContent, contentType } = req.payload;
  
  try {
    // Convert base64 to binary
    const binary = Buffer.from(fileContent, 'base64');
    
    // Upload the attachment
    const response = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/attachments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Atlassian-Token': 'no-check'
        },
        // Using multipart/form-data format
        body: {
          file: {
            filename: fileName,
            contentType: contentType,
            data: binary
          }
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to upload attachment: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      attachment: result
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Approve a sub-task
resolver.define('approveSubTask', async (req) => {
  const { issueKey } = req.payload;
  
  try {
    // Get available transitions
    const transitionsResponse = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/transitions`
    );
    const transitions = await transitionsResponse.json();
    console.log('Available transitions:', transitions);
    
    // Find approval transition ID
    const approvalTransition = transitions.transitions.find(
      t => t.name.toLowerCase().includes('approve') ||
           t.to.name.toLowerCase().includes('approved')
    );
    
    if (!approvalTransition) {
      console.error('No approval transition found');
      // Try to find any "done" or "complete" transition
      const doneTransition = transitions.transitions.find(
        t => t.name.toLowerCase().includes('done') ||
             t.to.name.toLowerCase().includes('done') ||
             t.name.toLowerCase().includes('complete') ||
             t.to.name.toLowerCase().includes('complete')
      );
      
      if (!doneTransition) {
        throw new Error('No approval or completion transition found');
      }
      
      // Use done transition instead
      console.log('Using done/complete transition:', doneTransition.id);
      
      await api.asApp().requestJira(
        route`/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transition: {
              id: doneTransition.id
            }
          })
        }
      );
    } else {
      // Execute the approval transition
      console.log('Using approval transition:', approvalTransition.id);
      await api.asApp().requestJira(
        route`/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transition: {
              id: approvalTransition.id
            }
          })
        }
      );
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error approving subtask:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Reject a sub-task (transition to Pending)
resolver.define('rejectSubTask', async (req) => {
  const { issueKey } = req.payload;
  
  try {
    // Get available transitions
    const transitionsResponse = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/transitions`
    );
    const transitions = await transitionsResponse.json();
    console.log('Available transitions:', transitions);
    
    // Find pending transition ID (first priority)
    const pendingTransition = transitions.transitions.find(
      t => t.name.toLowerCase().includes('pending') ||
           t.to.name.toLowerCase().includes('pending')
    );
    
    if (pendingTransition) {
      // Execute the pending transition
      console.log('Using pending transition:', pendingTransition.id);
      await api.asApp().requestJira(
        route`/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transition: {
              id: pendingTransition.id
            }
          })
        }
      );
      
      return { success: true };
    }
    
    // Fallback to reject transition if pending not found
    const rejectTransition = transitions.transitions.find(
      t => t.name.toLowerCase().includes('reject') ||
           t.to.name.toLowerCase().includes('reject') ||
           t.name.toLowerCase().includes('decline') ||
           t.to.name.toLowerCase().includes('declined')
    );
    
    if (!rejectTransition) {
      throw new Error('No pending or rejection transition found');
    }
    
    console.log('Using rejection transition as fallback:', rejectTransition.id);
    await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/transitions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transition: {
            id: rejectTransition.id
          }
        })
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error transitioning subtask to pending:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

export const handler = resolver.getDefinitions();