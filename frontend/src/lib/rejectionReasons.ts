/**
 * Quick reasons staff can pick when rejecting an advert (issue #38). Students are 13–14, so each is kind and
 * says what to fix. Staff can also type their own.
 */
export const REJECTION_REASONS = [
  "The text is too small to read on the big screen. Try bigger, bolder words.",
  "The picture is too blurry. Try a sharper photo or a bigger image.",
  "There are some spelling mistakes. Check the words and upload it again.",
  "It's hard to see what you're selling. Make your product or offer clearer.",
  "This isn't suitable for the event. Ask a member of staff if you're not sure why.",
  "Please don't include people's faces or names without their permission.",
] as const;

/** Same limit as the server. */
export const MAX_REJECTION_REASON = 200;
