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
    if (isCompleted) {
      return {
        icon: <CheckIcon />,
        iconClass: 'icon-completed',
        itemClass: '',
        badgeClass: 'status-badge-completed',
        badgeText: 'Completed'
      };
    } else if (isApprovalRequired) {
      return {
        icon: <BellIcon />,
        iconClass: 'icon-approval',
        itemClass: '',
        badgeClass: 'status-badge-approval',
        badgeText: 'Waiting for Approval'
      };
    } else if (isWaitingForInfo) {
      return {
        icon: <WarningIcon />,
        iconClass: 'icon-warning',
        itemClass: 'status-warning',
        badgeClass: 'status-badge-waiting',
        badgeText: 'Waiting for additional info'
      };
    }
    
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
    const assignee = subTask.fields.assignee?.displayName;
    if (!assignee) return "Unassigned";
    
    // Extract team name based on assignee (simplified logic)
    if (assignee.toLowerCase().includes('content')) {
      return "Content Team";
    } else if (assignee.toLowerCase().includes('design')) {
      return "Design Team";
    } else if (assignee.toLowerCase().includes('seo')) {
      return "SEO Team";
    }
    
    return assignee;
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
          {statusInfo.badgeText && (
            <div className={`status-badge ${statusInfo.badgeClass}`}>
              {statusInfo.badgeText}
            </div>
          )}
          
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
          
          {subTask.comments && subTask.comments.length > 0 && (
            <div className="comments-section">
              <h4 className="comments-heading">Comments</h4>
              {subTask.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author.displayName}</span>
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
        <div className="header">
          <h1>Subtasks Status</h1>
        </div>
        <div className="error-container">
          <div className="error-message">There are no sub-tasks associated with this request.</div>
          <button className="btn-approve" onClick={fetchData}>Refresh</button>
        </div>
      </div>
    );
  }
  
  // Count tasks by status
  const completedTasks = data.subTasks.filter(task => 
    task.fields.status.name.toLowerCase().includes('done') || 
    task.fields.status.name.toLowerCase().includes('complete') ||
    task.fields.status.name.toLowerCase().includes('approved')
  ).length;
  
  const inProgressTasks = data.subTasks.filter(task => 
    task.fields.status.name.toLowerCase().includes('progress') || 
    task.fields.status.name.toLowerCase().includes('review')
  ).length;
  
  const totalTasks = data.subTasks.length;
  const todoTasks = totalTasks - completedTasks - inProgressTasks;
  
  // Calculate percentages for each segment
  const donePercent = (completedTasks / totalTasks) * 100;
  const progressPercent = (inProgressTasks / totalTasks) * 100;
  const todoPercent = (todoTasks / totalTasks) * 100;
  
  return (
    <div className="container">
      <div className="header">
        <h1>Subtasks Status</h1>
        <div className="progress-section">
          <div className="progress-bar-container">
            <CustomProgressBar 
              value={donePercent} 
              appearance="success" 
              height={8} 
            />
          </div>
          <div className="progress-text">
            {Math.round(donePercent)}% Done
          </div>
        </div>
      </div>
      
      <div className="subtasks-list">
        {data.subTasks.map(subTask => (
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
    </div>
  );
}

export default App;