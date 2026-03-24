import { useEffect, useRef } from 'react';
import type { SDKMessageRecord } from '../types.js';
import { ToolCallBlock } from './ToolCallBlock.js';
import { ThinkingBlock } from './ThinkingBlock.js';

interface Props {
  messages: readonly SDKMessageRecord[];
  loading?: boolean;
}

function renderContentBlock(block: Record<string, unknown>, idx: number): React.JSX.Element | null {
  const blockType = block.type as string | undefined;

  if (blockType === 'text') {
    return (
      <div key={idx} className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
        {block.text as string}
      </div>
    );
  }

  if (blockType === 'tool_use') {
    return (
      <ToolCallBlock
        key={idx}
        name={(block.name as string) ?? 'unknown'}
        input={block.input}
      />
    );
  }

  if (blockType === 'tool_result') {
    const content = block.content;
    const text = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? (content as Record<string, unknown>[])
            .filter((c) => c.type === 'text')
            .map((c) => c.text as string)
            .join('\n')
        : JSON.stringify(content);
    return (
      <ToolCallBlock
        key={idx}
        name="Result"
        output={text}
      />
    );
  }

  if (blockType === 'thinking') {
    return <ThinkingBlock key={idx} content={(block.thinking as string) ?? ''} />;
  }

  return null;
}

function MessageEntry({ record }: { record: SDKMessageRecord }): React.JSX.Element {
  const msg = record.message;
  const role = msg.role as string | undefined;
  const type = msg.type as string | undefined;
  const content = msg.content;

  // Assistant message with content blocks
  if (role === 'assistant' || type === 'assistant') {
    const blocks = Array.isArray(content) ? (content as Record<string, unknown>[]) : [];
    const textOnly = typeof content === 'string';

    return (
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '0.8rem' }}>smart_toy</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {textOnly && (
            <div className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
              {content as string}
            </div>
          )}
          {blocks.map((block, idx) => renderContentBlock(block, idx))}
        </div>
      </div>
    );
  }

  // Tool use message (top-level)
  if (type === 'tool_use') {
    return (
      <div className="ml-9">
        <ToolCallBlock
          name={(msg.name as string) ?? 'unknown'}
          input={msg.input}
          output={msg.output}
        />
      </div>
    );
  }

  // Tool result message (top-level)
  if (role === 'tool' || type === 'tool_result') {
    const resultContent = msg.content ?? msg.output;
    const text = typeof resultContent === 'string'
      ? resultContent
      : JSON.stringify(resultContent);
    return (
      <div className="ml-9">
        <ToolCallBlock name="Result" output={text} />
      </div>
    );
  }

  // User / human message
  if (role === 'user' || role === 'human') {
    const text = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? (content as Record<string, unknown>[])
            .filter((c) => c.type === 'text')
            .map((c) => c.text as string)
            .join('\n')
        : JSON.stringify(content);
    return (
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-secondary-container/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: '0.8rem' }}>person</span>
        </div>
        <div className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </div>
    );
  }

  // Result summary
  if (type === 'result') {
    return (
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-green-400" style={{ fontSize: '0.8rem' }}>check</span>
        </div>
        <div className="text-sm text-green-400/80 whitespace-pre-wrap">
          {typeof content === 'string' ? content : JSON.stringify(content)}
        </div>
      </div>
    );
  }

  // Default: system event
  return (
    <div className="text-[0.7rem] text-on-surface-variant/50 font-mono pl-9">
      {type ?? role ?? 'event'}: {typeof content === 'string' ? content : JSON.stringify(msg)}
    </div>
  );
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-surface-container-high" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-container-high rounded w-3/4" />
            <div className="h-3 bg-surface-container-high rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageLog({ messages, loading }: Props): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {messages.map((record, idx) => (
        <MessageEntry key={idx} record={record} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
