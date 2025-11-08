import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageRenderer = ({ content, role }) => {
  // Check if content contains code blocks or markdown
  const hasCodeBlocks = content.includes('```');
  const hasMarkdown = content.includes('**') || content.includes('*') || content.includes('#') || content.includes('`');
  
  // Check if content contains file paths or documentation indicators
  const hasFileContent = content.includes('File:') || content.includes('.md') || content.includes('.js') || content.includes('.py') || content.includes('.json');
  
  // Check if content contains timing information
  const hasTiming = content.includes('⏱️') || content.includes('Response time:') || content.includes('Request time:');
  
  // If it's a simple message without markdown, render as plain text
  if (!hasCodeBlocks && !hasMarkdown && !hasFileContent && !hasTiming) {
    return (
      <div className="message-text-plain">
        {content.split('\n').map((line, index) => (
          <div key={index} className="message-line">
            {line}
          </div>
        ))}
      </div>
    );
  }

  // Render with markdown support
  return (
    <div className="message-text-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="code-block"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            return <div className="code-container" {...props}>{children}</div>;
          },
          h1({ children, ...props }) {
            return <h1 className="markdown-h1" {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            return <h2 className="markdown-h2" {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            return <h3 className="markdown-h3" {...props}>{children}</h3>;
          },
          p({ children, ...props }) {
            const text = String(children);
            // Enhanced file content detection
            if (text.startsWith('File:') || text.includes('.md') || text.includes('.js') || text.includes('.py')) {
              return (
                <div className="file-content-wrapper">
                  <div className="file-header">
                    📄 {text.includes('File:') ? text.replace('File:', '').trim() : 'Documentation'}
                  </div>
                  <div className="documentation-content">
                    {children}
                  </div>
                </div>
              );
            }
            return <p className="markdown-p" {...props}>{children}</p>;
          },
          ul({ children, ...props }) {
            return <ul className="markdown-ul" {...props}>{children}</ul>;
          },
          ol({ children, ...props }) {
            return <ol className="markdown-ol" {...props}>{children}</ol>;
          },
          li({ children, ...props }) {
            return <li className="markdown-li" {...props}>{children}</li>;
          },
          blockquote({ children, ...props }) {
            return <blockquote className="markdown-blockquote" {...props}>{children}</blockquote>;
          },
          table({ children, ...props }) {
            return <div className="table-container"><table className="markdown-table" {...props}>{children}</table></div>;
          },
          th({ children, ...props }) {
            return <th className="markdown-th" {...props}>{children}</th>;
          },
          td({ children, ...props }) {
            return <td className="markdown-td" {...props}>{children}</td>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;
