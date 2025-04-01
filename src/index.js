import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getSubTasksData', async (req) => {
  const { issueKey } = req.context;
  console.log('Processing request for issue:', issueKey);
  
  try {
    // Get request key from context
    const requestKey = req.context.extension?.request?.key;
    console.log('Request key from context:', requestKey);
    
    if (!requestKey) {
      return {
        success: false,
        error: "No request key found in context",
        context: req.context
      };
    }
    
    // Get the issue with its subtasks directly
    const issueResponse = await api.asApp().requestJira(
      route`/rest/api/3/issue/${requestKey}?fields=summary,description,status,subtasks`
    );
    
    if (!issueResponse.ok) {
      return {
        success: false,
        error: `Failed to get issue: ${issueResponse.status}`,
        context: req.context
      };
    }
    
    const issueData = await issueResponse.json();
    console.log('Main issue data retrieved:', issueData.key);
    
    // If no subtasks field or empty subtasks
    if (!issueData.fields?.subtasks || issueData.fields.subtasks.length === 0) {
      console.log('No subtasks found in the subtasks field');
      return { mainIssue: issueData, subTasks: [], success: true };
    }
    
    // Get complete data for each subtask
    const subtasksWithDetails = await Promise.all(
      issueData.fields.subtasks.map(async (subtask) => {
        try {
          const response = await api.asApp().requestJira(
            route`/rest/api/3/issue/${subtask.key}?fields=summary,status,description,attachment,assignee`
            // Added assignee to the fields
          );
          const subtaskData = await response.json();
          
          // Get comments for this subtask
          const commentsResponse = await api.asApp().requestJira(
            route`/rest/api/3/issue/${subtask.key}/comment`
          );
          const commentsData = await commentsResponse.json();
          
          return { 
            ...subtaskData, 
            comments: commentsData.comments || [],
            attachments: subtaskData.fields?.attachment || []
          };
        } catch (err) {
          console.error('Error getting subtask details:', err);
          return subtask;
        }
      })
    );
    
    console.log(`Found ${subtasksWithDetails.length} subtasks`);
    return {
      mainIssue: issueData,
      subTasks: subtasksWithDetails,
      success: true
    };
  } catch (error) {
    console.error('Error in getSubTasksData:', error);
    return {
      success: false,
      error: error.message,
      mainIssue: null,
      subTasks: []
    };
  }
});

// Add comment to an issue
resolver.define('addComment', async (req) => {
  const { issueKey, comment } = req.payload;
  
  try {
    const response = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/comment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: comment,
                    type: 'text'
                  }
                ]
              }
            ]
          }
        })
      }
    );
    
    const commentData = await response.json();
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