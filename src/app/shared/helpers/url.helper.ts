// Source: main.0ad03de76494ddf1.js webpack module 4183 (export `P`) – Egret template helper.
// Parses window.location.href query string. With a name returns that param (string, NOT URI-decoded per value
// beyond the whole-string decodeURIComponent), otherwise the whole map. Used by ThemeService ("theme") and
// LayoutService ("layout").
export function getQueryParam(prop?: string): any {
  const params: Record<string, string> = {};
  const search = decodeURIComponent(window.location.href.slice(window.location.href.indexOf('?') + 1));
  const definitions = search.split('&');
  definitions.forEach(function (val, key) {
    const parts = val.split('=', 2);
    params[parts[0]] = parts[1];
  });
  return prop && prop in params ? params[prop] : params;
}
