export function getAuthorizedUserIds() {
  return new Set(
    (process.env.AUTHORIZED_USER_IDS ?? "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );
}

export function isAuthorizedUserId(userId?: string) {
  return Boolean(userId && getAuthorizedUserIds().has(userId));
}
