import React from 'react';

// Component to render ADF content
const ADFRenderer = ({ document }) => {
  if (!document || typeof document === 'string') {
    return <div>{document || ''}</div>;
  }
  
  const renderNode = (node, index, parentType = null) => {
    if (!node) return null;

    switch (node.type) {
      case 'doc':
        return (
          <div className="adf-document" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i))}
          </div>
        );

      case 'paragraph':
        return (
          <p className="adf-paragraph" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'paragraph'))}
          </p>
        );

      case 'heading':
        const HeadingTag = `h${node.attrs?.level || 3}`;
        return (
          <HeadingTag className="adf-heading" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'heading'))}
          </HeadingTag>
        );

      case 'text':
        let content = node.text || '';
        
        // Apply marks for formatting
        if (node.marks && node.marks.length > 0) {
          // Process each mark
          for (const mark of node.marks) {
            if (mark.type === 'strong') {
              content = <strong key={`${index}-strong`}>{content}</strong>;
            } else if (mark.type === 'em') {
              content = <em key={`${index}-em`}>{content}</em>;
            } else if (mark.type === 'strike') {
              content = <del key={`${index}-strike`}>{content}</del>;
            } else if (mark.type === 'code') {
              content = <code key={`${index}-code`} className="adf-code">{content}</code>;
            } else if (mark.type === 'underline') {
              content = <u key={`${index}-u`}>{content}</u>;
            } else if (mark.type === 'link' && mark.attrs?.href) {
              // For links, use a simple <a> tag without event handlers
              content = (
                <a 
                  key={`${index}-link`}
                  href={mark.attrs.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="adf-link"
                >
                  {content}
                </a>
              );
            }
          }
        }
        
        return <span key={index}>{content}</span>;

      case 'bulletList':
        return (
          <ul className="adf-bullet-list" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'bulletList'))}
          </ul>
        );

      case 'orderedList':
        return (
          <ol className="adf-ordered-list" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'orderedList'))}
          </ol>
        );

      case 'listItem':
        return (
          <li className="adf-list-item" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'listItem'))}
          </li>
        );

      case 'mention':
        // Handle multiple "@" symbols in mentions
        let mentionText = node.attrs?.text || '';
        // Remove any leading @ as we'll add our own
        if (mentionText.startsWith('@')) {
          mentionText = mentionText.substring(1);
        }
        
        return (
          <span className="adf-mention" key={index}>
            @{mentionText}
          </span>
        );

      case 'emoji':
        return (
          <span className="adf-emoji" key={index} title={node.attrs?.shortName}>
            {node.attrs?.text || node.attrs?.shortName}
          </span>
        );

      case 'hardBreak':
        return <br key={index} />;
      
      case 'rule':
        return <hr key={index} className="adf-rule" />;

      case 'blockquote':
        return (
          <blockquote className="adf-blockquote" key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'blockquote'))}
          </blockquote>
        );
      
      case 'codeBlock':
        return (
          <pre className="adf-code-block" key={index}>
            <code>
              {node.content && node.content.map((child, i) => 
                child.text || ''
              ).join('')}
            </code>
          </pre>
        );
        
      case 'panel':
        const panelType = node.attrs?.panelType || 'info';
        return (
          <div className={`adf-panel adf-panel-${panelType}`} key={index}>
            {node.content && node.content.map((child, i) => renderNode(child, i, 'panel'))}
          </div>
        );

      default:
        // For any unhandled node types, try to render their content if available
        if (node.content) {
          return (
            <div className={`adf-${node.type || 'unknown'}`} key={index}>
              {node.content.map((child, i) => renderNode(child, i))}
            </div>
          );
        }
        return null;
    }
  };

  return renderNode(document);
};

export default ADFRenderer;