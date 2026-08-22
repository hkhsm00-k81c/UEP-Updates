# connectGoogleUser render context

## line 7

```js
4:     try{
5:       const profile=(typeof currentUserProfile==='function'?currentUserProfile():{})||{};
6:       const result=await window.schoolBoard?.authorizeGoogleUser?.({loginHint:String(profile.email||'')});
7:       if(!result?.ok){googleConnectionError=result?.reason||'학교 공용 연결 확인에 실패했습니다.'; if(typeof toast==='function')toast(googleConnectionError); try{render(state.activePage||'dashboard');}catch{} return;}
8:       const status=await window.schoolBoard?.googleCredentialStatus?.();if(status)googleConnectionStatus=status;
9:       if(result.syncOk===false){
10:         googleConnectionError=result.syncError||'Google 계정 승인은 완료되었지만 학교 시트 조회에 실패했습니다.';
```

## line 17

```js
14:         if(typeof toast==='function')toast('학교 공용 읽기 연결 및 학교 시트 동기화가 완료되었습니다.');
15:       }
16:       if(window.schoolBoard?.readReadonlyCache){const cached=await window.schoolBoard.readReadonlyCache();if(cached?.ok)readonlyCache=cached.data;}
17:       if(typeof refreshReadonlyCacheSilently==='function')await refreshReadonlyCacheSilently({force:true,rerender:true});
18:       if(typeof updateTopSyncStatus==='function')updateTopSyncStatus();
19:       if(typeof startReadonlyAutoRefresh==='function')startReadonlyAutoRefresh();
20:       if(typeof toast==='function')toast(`Google 읽기 연결 완료${result.account?' · '+result.account:''}`);
```

