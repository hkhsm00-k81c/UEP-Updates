# startReadonlyAutoRefresh Audit

setInterval: 1
clearInterval: 1
cache refresh calls: 1
existing timer guard: true
visibility guard: false
active-page guard: false

Risk: {"duplicateTimer":false,"backgroundRefresh":true,"alwaysRefresh":true}

```js
function startReadonlyAutoRefresh(){
  if(readonlyAutoRefreshTimer) clearInterval(readonlyAutoRefreshTimer);
  if(!googleConnectionStatus?.ok) return;
  readonlyAutoRefreshTimer=setInterval(()=>refreshReadonlyCacheSilently({force:true,rerender:true}),READONLY_AUTO_REFRESH_MS);
}
```
