import { Upload, ThumbsUp, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InteractionType } from './types';

interface Props {
  nodeId: string;
  interactionType: InteractionType;
  prompt: string;
  position: { x: number; y: number };
  onSubmit: (nodeId: string, data: Record<string, unknown>) => void;
}

const typeConfig: Record<InteractionType, { icon: React.ReactNode; buttonLabel: string; buttonIcon: React.ReactNode }> = {
  file_upload: {
    icon: <Upload className="h-4 w-4 text-amber-500" />,
    buttonLabel: 'Upload & Continue',
    buttonIcon: <FileText className="h-3 w-3" />,
  },
  approval: {
    icon: <ThumbsUp className="h-4 w-4 text-amber-500" />,
    buttonLabel: 'Approve & Continue',
    buttonIcon: <ThumbsUp className="h-3 w-3" />,
  },
  text_input: {
    icon: <MessageSquare className="h-4 w-4 text-amber-500" />,
    buttonLabel: 'Submit & Continue',
    buttonIcon: <MessageSquare className="h-3 w-3" />,
  },
  form: {
    icon: <FileText className="h-4 w-4 text-amber-500" />,
    buttonLabel: 'Submit & Continue',
    buttonIcon: <FileText className="h-3 w-3" />,
  },
  preflight: {
    icon: <FileText className="h-4 w-4 text-amber-500" />,
    buttonLabel: 'Submit & Continue',
    buttonIcon: <FileText className="h-3 w-3" />,
  },
  sop_upload: {
    icon: <Upload className="h-4 w-4 text-blue-500" />,
    buttonLabel: 'Upload & Ingest',
    buttonIcon: <Upload className="h-3 w-3" />,
  },
};

export default function NodeInteractionPrompt({ nodeId, interactionType, prompt, position, onSubmit }: Props) {
  const config = typeConfig[interactionType];

  return (
    <div
      className="absolute nodrag nopan z-100"
      style={{
        transform: `translate(-50%, -100%) translate(${position.x}px, ${position.y - 12}px)`,
        pointerEvents: 'auto',
      }}
    >
      <div className="w-[200px] rounded-lg border border-amber-500/40 bg-card shadow-lg p-2.5 space-y-2">
        <div className="flex items-center gap-2">
          {config.icon}
          <p className="text-[10px] font-medium text-foreground leading-tight">{prompt}</p>
        </div>
        <Button
          size="sm"
          className="w-full h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => onSubmit(nodeId, { submitted: true })}
        >
          {config.buttonIcon}
          <span className="ml-1">{config.buttonLabel}</span>
        </Button>
      </div>
      <div className="flex justify-center">
        <div className="w-2 h-2 rotate-45 bg-card border-b border-r border-amber-500/40 -mt-1" />
      </div>
    </div>
  );
}
