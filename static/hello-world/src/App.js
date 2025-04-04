import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

import './App.css';

// Format file size into human-readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Custom Progress Bar component
const CustomProgressBar = ({ value, appearance = 'default', height = 8 }) => {
  const normalizedValue = Math.min(Math.max(0, value), 100);
  
  const getBarColor = () => {
    switch (appearance) {
      case 'success': return '#36B37E';
      case 'warning': return '#FFAB00';
      case 'danger': return '#FF5630';
      default: return '#0052CC';
    }
  };
  
  return (
    <div
      style={{
        backgroundColor: '#f4f5f7',
        borderRadius: height / 2,
        height: `${height}px`,
        overflow: 'hidden',
        width: '100%',
      }}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          backgroundColor: getBarColor(),
          borderRadius: height / 2,
          height: '100%',
          transition: 'width 0.3s ease',
          width: `${normalizedValue}%`,
        }}
      />
    </div>
  );
};

// Custom Spinner component
const CustomSpinner = ({ size = 'medium', color = '#0052CC' }) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 32;
      default: return 24;
    }
  };
  
  const spinnerSize = getSize();
  
  return (
    <div
      style={{
        display: 'inline-block',
        width: spinnerSize,
        height: spinnerSize,
        border: `2px solid rgba(0, 0, 0, 0.1)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Icons components
const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M8 12L10.5 14.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WarningIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
    <path 
      d="M12 2C13.3132 2 14.6136 2.25866 15.8268 2.76121C17.0401 3.26375 18.1425 4.00035 19.0711 4.92893C19.9997 5.85752 20.7362 6.95991 21.2388 8.17317C21.7413 9.38642 22 10.6868 22 12"
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      className="spinner-path"
    />
  </svg>
);

const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const OpenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M8 12L16 12M16 12L13 9M16 12L13 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProgressIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path 
      d="M12 7V8M12 16V18M8 12H6M18 12H16M16.24 16.24L14.83 14.83M16.24 7.76L14.83 9.17M7.76 16.24L9.17 14.83M7.76 7.76L9.17 9.17" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

// Create a helper function at the top of the file
const getAvatarUrl = (accountId) => {
  if (!accountId || accountId === 'addon_oneims-jsm-subtask-widget') {
    return null;
  }
  return `https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/avatars/${accountId}/48`;
};

// Add this helper function at the top of your file 
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Add this helper function to generate colors based on name
const generateColorFromName = (name) => {
  if (!name) return '#6B778C';
  
  // Define a set of colors to use
  const colors = [
    '#0052CC', // Blue
    '#00B8D9', // Cyan
    '#36B37E', // Green
    '#6554C0', // Purple
    '#FF5630', // Red
    '#FF8B00', // Orange
    '#6B778C', // Grey
  ];
  
  // Create a hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Choose a color based on the hash
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

// SubTask component
function SubTaskItem({ subTask, onApprove, onReject, onAddComment, onUploadFile }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const status = subTask.fields.status.name;
  const isApprovalRequired = status.toLowerCase().includes('waiting for approval');
  const isWaitingForInfo = status.toLowerCase().includes('waiting for additional info') || 
                          status.toLowerCase().includes('needs info');
  const isCompleted = status.toLowerCase().includes('done') || 
                    status.toLowerCase().includes('complete') || 
                    status.toLowerCase().includes('approved');
  
  // Get status info for styling
  const getStatusInfo = () => {
    const statusLower = status.toLowerCase();

    // Completed/Done states (Green)
    if (statusLower.includes('done') || 
        statusLower.includes('complete') || 
        statusLower.includes('approved')) {
      return {
        icon: <CheckIcon />,
        iconClass: 'icon-completed',
        itemClass: 'status-completed',
        badgeClass: 'status-badge-completed',
        badgeText: 'Completed'
      };
    }
    
    // Work in Progress states (Blue)
    if (statusLower.includes('progress')) {
      return {
        icon: <ProgressIcon />,
        iconClass: 'icon-progress',
        itemClass: 'status-progress',
        badgeClass: 'status-badge-progress',
        badgeText: 'Work in Progress'
      };
    }

    // Pending state (Blue)
    if (statusLower.includes('pending')) {
      return {
        icon: <ClockIcon />,
        iconClass: 'icon-pending',
        itemClass: 'status-pending',
        badgeClass: 'status-badge-pending',
        badgeText: 'Pending'
      };
    }

    // Reopened state (Grey) - Move this before Open check
    if (statusLower.includes('reopened')) {
      return {
        icon: <RefreshIcon />,
        iconClass: 'icon-reopened',
        itemClass: 'status-reopened',
        badgeClass: 'status-badge-reopened',
        badgeText: 'Reopened'
      };
    }

    // Open state (Grey) - Make more specific
    if (statusLower === 'open') {
      return {
        icon: <OpenIcon />,
        iconClass: 'icon-open',
        itemClass: 'status-open',
        badgeClass: 'status-badge-open',
        badgeText: 'Open'
      };
    }

    // Waiting states (Orange)
    if (statusLower.includes('waiting')) {
      if (statusLower.includes('approval')) {
        return {
          icon: <BellIcon />,
          iconClass: 'icon-approval',
          itemClass: 'status-approval',
          badgeClass: 'status-badge-approval',
          badgeText: 'Waiting for Approval'
        };
      }
      return {
        icon: <WarningIcon />,
        iconClass: 'icon-warning',
        itemClass: 'status-warning',
        badgeClass: 'status-badge-waiting',
        badgeText: 'Waiting for Customer'
      };
    }

    // Default fallback
    return {
      icon: <BellIcon />,
      iconClass: '',
      itemClass: '',
      badgeClass: '',
      badgeText: status
    };
  };
  
  const statusInfo = getStatusInfo();
  
  // Get assigned team from the issue's assignee field
  const getAssignedTeam = () => {
    const assignee = subTask.fields.assignee;
    if (!assignee) return "Unassigned";
    
    // Return the display name or account name
    return assignee.displayName || assignee.name || "Unassigned";
  };
  
  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    await onAddComment(subTask.key, comment);
    setComment('');
    setIsSubmitting(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          // Remove the "data:*/*;base64," prefix to get just the base64 content
          const base64Content = reader.result.split(',')[1];
          
          await onUploadFile(subTask.key, file.name, base64Content, file.type);
        } catch (error) {
          console.error('Upload error:', error);
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setIsUploading(false);
      };
    } catch (err) {
      setIsUploading(false);
    }
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    console.log("SubTask comments:", subTask.comments || subTask.fields?.comment?.comments);
    
    // Log details for all comments
    const comments = subTask.comments || subTask.fields?.comment?.comments;
    if (comments && comments.length > 0) {
      console.log(`Found ${comments.length} comments for subtask ${subTask.key}`);
      
      comments.forEach((comment, index) => {
        console.log(`Comment ${index + 1}:`, {
          id: comment.id,
          author: comment.author,
          avatarUrl: comment.author.avatarUrl,
          accountId: comment.author.accountId
        });
      });
    }
  }, [subTask]);

  return (
    <div className={`subtask-item ${statusInfo.itemClass}`}>
      <div className="subtask-header">
        <div className="subtask-title-section">
          <div className={`subtask-icon ${statusInfo.iconClass}`}>
            {statusInfo.icon}
          </div>
          <div className="subtask-info">
            <h3 className="subtask-title">{subTask.fields.summary}</h3>
            <div className="subtask-assignment">Assigned to: {getAssignedTeam()}</div>
          </div>
        </div>
        
        <div className="subtask-status-section">
          {isApprovalRequired && (
            <div className="action-buttons">
              <button className="btn-approve" onClick={() => onApprove(subTask.key)}>
                Approve
              </button>
              <button className="btn-reject" onClick={() => onReject(subTask.key)}>
                Reject
              </button>
            </div>
          )}
          
          {statusInfo.badgeText && (
            <div className={`status-badge ${statusInfo.badgeClass}`}>
              {statusInfo.badgeText}
            </div>
          )}
          
          <button className="chevron-button" onClick={toggleExpand}>
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="subtask-details">
          {/* Always show attachments section with upload button */}
          <div className="attachments-section">
            <h4 className="attachments-heading">Attachments</h4>
            
            {subTask.attachments && subTask.attachments.length > 0 ? (
              <div className="attachments-list">
                {subTask.attachments.map(attachment => (
                  <div key={attachment.id} className="attachment-item">
                    <a href={attachment.content} target="_blank" rel="noopener noreferrer">
                      {attachment.filename}
                    </a>
                    <span className="attachment-size">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No attachments yet</p>
            )}
            
            <div className="file-upload">
              <label className="file-upload-label">
                <span>{isUploading ? 'Uploading...' : 'Upload file'}</span>
                <input 
                  type="file" 
                  className="file-upload-input" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
          
          {(subTask.comments || subTask.fields?.comment?.comments) && (
            <div className="comments-section">
              <h4 className="comments-heading">Comments</h4>
              {(subTask.comments || subTask.fields?.comment?.comments).map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">
                      {comment.author.accountId === 'addon_oneims-jsm-subtask-widget' ? (
                        <span className="app-avatar">APP</span>
                      ) : (
                        <>
                          <div 
                            className="user-avatar-container"
                            style={{
                              backgroundColor: generateColorFromName(comment.author.displayName),
                              color: '#FFFFFF'
                            }}
                          >
                            {comment.author.avatarUrl ? (
                              <img 
                                src={comment.author.avatarUrl} 
                                alt={comment.author.displayName}
                                className="user-avatar"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="fallback-avatar-text">
                              {getInitials(comment.author.displayName)}
                            </div>
                          </div>
                        </>
                      )}
                      <span>{comment.author.displayName}</span>
                    </span>
                    <span className="comment-time">
                      {new Date(comment.created).toLocaleString(undefined, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(',', '')}
                    </span>
                  </div>
                  <div className="comment-content">
                    {typeof comment.body === 'string' 
                      ? comment.body 
                      : comment.body?.content?.[0]?.content?.[0]?.text || ''}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="comment-input">
            <input
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
            />
            <button 
              className="comment-submit" 
              onClick={handleCommentSubmit}
              disabled={!comment.trim() || isSubmitting}
            >
              {isSubmitting ? <CustomSpinner size="small" /> : <SendIcon />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add this function before the App component
const groupSubtasks = (subtasks) => {
  return subtasks.reduce((groups, subtask) => {
    const status = subtask.fields.status.name.toLowerCase();
    
    if (status.includes('waiting') || status.includes('needs info')) {
      groups.requiresInput.push(subtask);
    } else if (status.includes('progress') || status.includes('pending')) {
      groups.inProgress.push(subtask);
    } else if (status === 'open' || status.includes('reopened')) {
      groups.notStarted.push(subtask);
    } else if (status.includes('done') || 
               status.includes('complete') || 
               status.includes('approved')) {
      groups.completed.push(subtask);
    }
    
    return groups;
  }, {
    requiresInput: [],
    inProgress: [],
    notStarted: [],
    completed: []
  });
};

const fetchSubtasks = async () => {
  try {
    console.log('Calling resolver with context:', { issueKey: 'YOUR-ISSUE-KEY' });
    const result = await invoke('getSubTasksData', { 
      context: { 
        issueKey: 'YOUR-ISSUE-KEY' // Make sure this is being set correctly
      }
    });
    console.log('Resolver result:', result);
  } catch (error) {
    console.error('Error in fetchSubtasks:', error);
  }
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching data...');
      const result = await invoke('getSubTasksData');
      console.log('Result from resolver:', result);
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      console.error('Error invoking resolver:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleApprove = async (subTaskKey) => {
    try {
      const result = await invoke('approveSubTask', { issueKey: subTaskKey });
      if (result.success) {
        // Refresh data to get updated status
        fetchData();
      } else {
        setError(result.error || 'Failed to approve task');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    }
  };
  
  const handleReject = async (subTaskKey) => {
    try {
      const result = await invoke('rejectSubTask', { issueKey: subTaskKey });
      if (result.success) {
        // Refresh data to get updated status
        fetchData();
      } else {
        setError(result.error || 'Failed to reject task');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    }
  };
  
  const handleAddComment = async (subTaskKey, comment) => {
    try {
      const result = await invoke('addComment', { issueKey: subTaskKey, comment });
      if (result.success) {
        // Refresh data to get updated comments
        fetchData();
        return true;
      } else {
        setError(result.error || 'Failed to add comment');
        return false;
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      return false;
    }
  };
  
  const handleFileUpload = async (issueKey, fileName, fileContent, contentType) => {
    try {
      const result = await invoke('uploadAttachment', {
        issueKey,
        fileName,
        fileContent,
        contentType
      });
      
      if (result.success) {
        // Refresh data to show new attachment
        fetchData();
        return true;
      } else {
        setError(result.error || 'Failed to upload attachment');
        return false;
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      return false;
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <CustomSpinner size="large" />
        <p>Loading tasks...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <div className="error-title">Error loading data</div>
        <div className="error-message">{error}</div>
        <button className="btn-approve" onClick={fetchData}>Try Again</button>
      </div>
    );
  }
  
  if (!data || !data.subTasks || data.subTasks.length === 0) {
    return (
      <div className="container">
        <div className="error-container">
          <div className="error-message">There are no sub-tasks associated with this request.</div>
          <button className="btn-approve" onClick={fetchData}>Refresh</button>
        </div>
      </div>
    );
  }
  
  // Update the status counting logic
  const statusCounts = data.subTasks.reduce((acc, task) => {
    const status = task.fields.status.name.toLowerCase();
    if (status.includes('done') || 
        status.includes('complete') || 
        status.includes('approved')) {
      acc.completed++;
    } else if (status.includes('waiting')) {
      acc.waiting++;
    } else if (status.includes('progress') || 
               status.includes('pending') ||
               status.includes('in review')) {
      acc.inProgress++;
    } else if (status === 'open' || 
               status.includes('reopened')) {
      acc.neutral++;
    }
    return acc;
  }, { completed: 0, inProgress: 0, waiting: 0, neutral: 0 });

  const totalTasks = data.subTasks.length;
  const completedPercent = (statusCounts.completed / totalTasks) * 100;
  const waitingPercent = (statusCounts.waiting / totalTasks) * 100;
  const inProgressPercent = (statusCounts.inProgress / totalTasks) * 100;
  const neutralPercent = (statusCounts.neutral / totalTasks) * 100;

  const groupedSubtasks = groupSubtasks(data.subTasks);

  return (
    <div className="container">
      <div className="header">
        <div className="progress-section">
          <div className="progress-bar-container">
            <div 
              className="progress-segment progress-segment-done" 
              style={{ width: `${completedPercent}%` }} 
            />
            <div 
              className="progress-segment progress-segment-waiting" 
              style={{ width: `${waitingPercent}%` }} 
            />
            <div 
              className="progress-segment progress-segment-progress" 
              style={{ width: `${inProgressPercent}%` }} 
            />
            <div 
              className="progress-segment progress-segment-neutral" 
              style={{ width: `${neutralPercent}%` }} 
            />
          </div>
          <div className="progress-text">
            {Math.round(completedPercent)}% Done
          </div>
        </div>
      </div>
      
      <div className="subtasks-list">
        {/* Requires Input section */}
        {groupedSubtasks.requiresInput.length > 0 && (
          <div className="subtasks-group">
            <h2 className="group-heading">Requires Input</h2>
            {groupedSubtasks.requiresInput.map(subTask => (
              <SubTaskItem 
                key={subTask.key}
                subTask={subTask}
                onApprove={handleApprove}
                onReject={handleReject}
                onAddComment={handleAddComment}
                onUploadFile={handleFileUpload}
              />
            ))}
          </div>
        )}

        {/* Work in Progress section */}
        {groupedSubtasks.inProgress.length > 0 && (
          <div className="subtasks-group">
            <h2 className="group-heading">Work in Progress</h2>
            {groupedSubtasks.inProgress.map(subTask => (
              <SubTaskItem 
                key={subTask.key}
                subTask={subTask}
                onApprove={handleApprove}
                onReject={handleReject}
                onAddComment={handleAddComment}
                onUploadFile={handleFileUpload}
              />
            ))}
          </div>
        )}

        {/* Not Started section */}
        {groupedSubtasks.notStarted.length > 0 && (
          <div className="subtasks-group">
            <h2 className="group-heading">Not Started</h2>
            {groupedSubtasks.notStarted.map(subTask => (
              <SubTaskItem 
                key={subTask.key}
                subTask={subTask}
                onApprove={handleApprove}
                onReject={handleReject}
                onAddComment={handleAddComment}
                onUploadFile={handleFileUpload}
              />
            ))}
          </div>
        )}

        {/* Completed section */}
        {groupedSubtasks.completed.length > 0 && (
          <div className="subtasks-group">
            <h2 className="group-heading">Completed</h2>
            {groupedSubtasks.completed.map(subTask => (
              <SubTaskItem 
                key={subTask.key}
                subTask={subTask}
                onApprove={handleApprove}
                onReject={handleReject}
                onAddComment={handleAddComment}
                onUploadFile={handleFileUpload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;