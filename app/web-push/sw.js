/* Web通知の受信専用。旅行や写真のキャッシュは作らない。 */
'use strict';
self.addEventListener('push', event => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch (_) {}
  const title = typeof message.title === 'string' ? message.title.slice(0, 80) : '旅のノート';
  const body = typeof message.body === 'string' ? message.body.slice(0, 300) : '予定を確認しましょう';
  const tag = typeof message.tag === 'string' ? message.tag.slice(0, 100) : 'tabinote-reminder';
  event.waitUntil(self.registration.showNotification(title, {
    body, tag, data: { url: self.registration.scope }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // 通知のペイロードから任意の外部URLを開かない。
  const appUrl = self.registration.scope;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const tab = tabs.find(tab => tab.url.startsWith(appUrl));
    if (tab) return tab.focus();
    return self.clients.openWindow(appUrl);
  })());
});
