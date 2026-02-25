import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ClientFeedback } from '@/hooks/useClientFeedback';
import { useSubmitFeedback } from '@/hooks/useClientFeedback';
import { cn } from '@/lib/utils';
import { Frown, Loader2, Smile, Send } from 'lucide-react';
import { useState } from 'react';

interface FeedbackWidgetProps {
  loadId: string;
  clientId: string;
  existingFeedback?: ClientFeedback | null;
}

export function FeedbackWidget({ loadId, clientId, existingFeedback }: FeedbackWidgetProps) {
  const [selectedRating, setSelectedRating] = useState<'happy' | 'unhappy' | null>(
    existingFeedback?.rating ?? null
  );
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState(existingFeedback?.comment ?? '');
  const [submitted, setSubmitted] = useState(!!existingFeedback);

  const submitFeedback = useSubmitFeedback();

  const handleRatingClick = (rating: 'happy' | 'unhappy') => {
    if (submitted && existingFeedback?.rating === rating) return;
    
    setSelectedRating(rating);

    if (rating === 'happy') {
      // Submit immediately for happy
      submitFeedback.mutate(
        { load_id: loadId, client_id: clientId, rating: 'happy', comment: null },
        {
          onSuccess: () => {
            setSubmitted(true);
            setShowCommentBox(false);
          },
        }
      );
    } else {
      // Show comment box for unhappy
      setShowCommentBox(true);
    }
  };

  const handleSubmitUnhappy = () => {
    submitFeedback.mutate(
      { load_id: loadId, client_id: clientId, rating: 'unhappy', comment: comment || null },
      {
        onSuccess: () => {
          setSubmitted(true);
          setShowCommentBox(false);
        },
      }
    );
  };

  // Already submitted - show current state
  if (submitted && !showCommentBox) {
    return (
      <div className="flex items-center gap-2">
        {selectedRating === 'happy' ? (
          <Badge variant="outline" className="gap-1 text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800">
            <Smile className="h-3.5 w-3.5" />
            Happy
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800">
            <Frown className="h-3.5 w-3.5" />
            Unhappy
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => {
            setSubmitted(false);
            setSelectedRating(null);
            setShowCommentBox(false);
          }}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Rate service:</span>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 rounded-full transition-all',
            selectedRating === 'happy'
              ? 'bg-green-100 text-green-600 ring-2 ring-green-300 dark:bg-green-900/50 dark:text-green-400 dark:ring-green-700'
              : 'hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30'
          )}
          onClick={() => handleRatingClick('happy')}
          disabled={submitFeedback.isPending}
          title="Happy with service"
        >
          {submitFeedback.isPending && selectedRating === 'happy' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Smile className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 rounded-full transition-all',
            selectedRating === 'unhappy'
              ? 'bg-red-100 text-red-600 ring-2 ring-red-300 dark:bg-red-900/50 dark:text-red-400 dark:ring-red-700'
              : 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30'
          )}
          onClick={() => handleRatingClick('unhappy')}
          disabled={submitFeedback.isPending}
          title="Unhappy with service"
        >
          <Frown className="h-5 w-5" />
        </Button>
      </div>

      {/* Comment box for unhappy rating */}
      {showCommentBox && selectedRating === 'unhappy' && (
        <div className="space-y-2 pl-0.5">
          <Textarea
            placeholder="Tell us what went wrong (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSubmitUnhappy}
              disabled={submitFeedback.isPending}
              className="gap-1.5"
            >
              {submitFeedback.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit Feedback
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCommentBox(false);
                setSelectedRating(null);
              }}
              disabled={submitFeedback.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
