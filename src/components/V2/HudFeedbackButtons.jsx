/**
 * HudFeedbackButtons — thumbs up / down under an assistant message (V2 HUD).
 *
 * Same contract as literacyseed's FeedbackButtons (the sprout-chat
 * reference): one vote per user per message, clicking the same rating
 * toggles it off, switching ratings swaps the counts; optimistic update
 * reconciled against the server's authoritative ``feedback_counts`` +
 * ``my_feedback`` after each round trip. Votes feed the prompt-quality
 * telemetry loop — user ratings are the online eval signal.
 *
 * Styling is the HUD chip idiom (chamfered, mono, cyan) via HudChip.
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { FiThumbsDown, FiThumbsUp } from 'react-icons/fi';

import {
  removeMessageFeedback,
  submitMessageFeedback
} from '../../application/aiChat/aiChatService';
import HudChip from './HudChip';

export default function HudFeedbackButtons({
  conversationId,
  messageId,
  initialRating = null,
  initialCounts = { up: 0, down: 0 }
}) {
  const [rating, setRating] = useState(initialRating);
  const [counts, setCounts] = useState(initialCounts || { up: 0, down: 0 });
  const [saving, setSaving] = useState(false);

  const submit = useCallback(
    async (next) => {
      if (!conversationId || !messageId || saving) return;

      const action = rating === next ? 'remove' : 'set';
      const prevRating = rating;
      const prevCounts = counts;

      const nextCounts = { ...counts };
      if (action === 'remove') {
        nextCounts[next] = Math.max(0, (nextCounts[next] || 0) - 1);
        setRating(null);
      } else {
        if (prevRating && prevRating !== next) {
          nextCounts[prevRating] = Math.max(
            0,
            (nextCounts[prevRating] || 0) - 1
          );
        }
        nextCounts[next] = (nextCounts[next] || 0) + 1;
        setRating(next);
      }
      setCounts(nextCounts);
      setSaving(true);
      try {
        let data;
        if (action === 'set') {
          data = await submitMessageFeedback(conversationId, messageId, next);
        } else {
          data = await removeMessageFeedback(conversationId, messageId);
        }
        if (data?.feedback_counts) setCounts(data.feedback_counts);
        if (data && 'my_feedback' in data) setRating(data.my_feedback);
      } catch (_err) {
        setRating(prevRating);
        setCounts(prevCounts);
      } finally {
        setSaving(false);
      }
    },
    [conversationId, messageId, rating, counts, saving]
  );

  if (!conversationId || !messageId) return null;

  const chip = (kind, Icon, count, title) => (
    <HudChip
      active={rating === kind}
      onClick={() => submit(kind)}
      disabled={saving}
      title={title}
      aria-label={title}
      aria-pressed={rating === kind}
      className={
        rating === kind ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-400'
      }
    >
      <Icon size={11} />
      {count > 0 && <span className="ml-1 tabular-nums">{count}</span>}
    </HudChip>
  );

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {chip('up', FiThumbsUp, counts?.up || 0, 'Good response')}
      {chip('down', FiThumbsDown, counts?.down || 0, 'Bad response')}
    </div>
  );
}

HudFeedbackButtons.propTypes = {
  conversationId: PropTypes.string,
  messageId: PropTypes.string,
  initialRating: PropTypes.string,
  initialCounts: PropTypes.shape({
    up: PropTypes.number,
    down: PropTypes.number
  })
};
