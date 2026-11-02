/**
 * Node/tests mirror of public/js/machine-focus.mjs — keep behavior identical.
 */
function shouldFocusAskDecline(state) {
  return Boolean(state?.askVisible) && !Boolean(state?.alreadyOpen);
}

function hashFocusOnlyScrolls(state) {
  return Boolean(state?.askVisible) || Boolean(state?.alreadyOpen);
}

module.exports = {
  shouldFocusAskDecline,
  hashFocusOnlyScrolls
};