import{Ct as e,Dt as t,Et as n,Ot as r,St as i,Tt as a,_t as o,bt as s,dt as c,ft as l,gt as u,ht as d,kt as f,lt as p,mt as m,pt as h,ut as ee,vt as te,wt as g,xt as _,yt as ne}from"./index-mj8n8iiv-C5kJyD8Q.js";
/**
* @license
* Copyright 2017 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
var v=`firebasestorage.googleapis.com`,y=`storageBucket`,re=120*1e3,b=600*1e3,x=class e extends g{constructor(t,n,r=0){super(C(t),`Firebase Storage: ${n} (${C(t)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,e.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return C(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}\n${this.customData.serverResponse}`:this.message=this._baseMessage}},S;(function(e){e.UNKNOWN=`unknown`,e.OBJECT_NOT_FOUND=`object-not-found`,e.BUCKET_NOT_FOUND=`bucket-not-found`,e.PROJECT_NOT_FOUND=`project-not-found`,e.QUOTA_EXCEEDED=`quota-exceeded`,e.UNAUTHENTICATED=`unauthenticated`,e.UNAUTHORIZED=`unauthorized`,e.UNAUTHORIZED_APP=`unauthorized-app`,e.RETRY_LIMIT_EXCEEDED=`retry-limit-exceeded`,e.INVALID_CHECKSUM=`invalid-checksum`,e.CANCELED=`canceled`,e.INVALID_EVENT_NAME=`invalid-event-name`,e.INVALID_URL=`invalid-url`,e.INVALID_DEFAULT_BUCKET=`invalid-default-bucket`,e.NO_DEFAULT_BUCKET=`no-default-bucket`,e.CANNOT_SLICE_BLOB=`cannot-slice-blob`,e.SERVER_FILE_WRONG_SIZE=`server-file-wrong-size`,e.NO_DOWNLOAD_URL=`no-download-url`,e.INVALID_ARGUMENT=`invalid-argument`,e.INVALID_ARGUMENT_COUNT=`invalid-argument-count`,e.APP_DELETED=`app-deleted`,e.INVALID_ROOT_OPERATION=`invalid-root-operation`,e.INVALID_FORMAT=`invalid-format`,e.INTERNAL_ERROR=`internal-error`,e.UNSUPPORTED_ENVIRONMENT=`unsupported-environment`})(S||={});function C(e){return`storage/`+e}function ie(){return new x(S.UNKNOWN,`An unknown error occurred, please check the error payload for server response.`)}function ae(){return new x(S.RETRY_LIMIT_EXCEEDED,`Max retry time for operation exceeded, please try again.`)}function oe(){return new x(S.CANCELED,`User canceled the upload/download.`)}function se(e){return new x(S.INVALID_URL,`Invalid URL '`+e+`'.`)}function ce(e){return new x(S.INVALID_DEFAULT_BUCKET,`Invalid default bucket '`+e+`'.`)}function le(){return new x(S.NO_DEFAULT_BUCKET,`No default bucket found. Did you set the '`+y+`' property when initializing the app?`)}function w(e){return new x(S.INVALID_ARGUMENT,e)}function T(){return new x(S.APP_DELETED,`The Firebase app was deleted.`)}function ue(e){return new x(S.INVALID_ROOT_OPERATION,`The operation '`+e+`' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').`)}
/**
* @license
* Copyright 2017 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
var E=class e{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){let e=encodeURIComponent;return`/b/`+e(this.bucket)+`/o/`+e(this.path)}bucketOnlyServerUrl(){return`/b/`+encodeURIComponent(this.bucket)+`/o`}static makeFromBucketSpec(t,n){let r;try{r=e.makeFromUrl(t,n)}catch{return new e(t,``)}if(r.path===``)return r;throw ce(t)}static makeFromUrl(t,n){let r=null,i=`([A-Za-z0-9.\\-_]+)`;function a(e){e.path.charAt(e.path.length-1)===`/`&&(e.path_=e.path_.slice(0,-1))}let o=RegExp(`^gs://`+i+`(/(.*))?$`,`i`),s={bucket:1,path:3};function c(e){e.path_=decodeURIComponent(e.path)}let l=n.replace(/[.]/g,`\\.`),u=RegExp(`^https?://${l}/v[A-Za-z0-9_]+/b/${i}/o(/([^?#]*).*)?\$`,`i`),d={bucket:1,path:3},f=n===v?`(?:storage.googleapis.com|storage.cloud.google.com)`:n,p=RegExp(`^https?://${f}/${i}/([^?#]*)`,`i`),m=[{regex:o,indices:s,postModify:a},{regex:u,indices:d,postModify:c},{regex:p,indices:{bucket:1,path:2},postModify:c}];for(let n=0;n<m.length;n++){let i=m[n],a=i.regex.exec(t);if(a){let t=a[i.indices.bucket],n=a[i.indices.path];n||=``,r=new e(t,n),i.postModify(r);break}}if(r==null)throw se(t);return r}},de=class{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}};
/**
* @license
* Copyright 2017 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
function fe(e,t,n){let r=1,i=null,a=null,o=!1,s=0;function c(){return s===2}let l=!1;function u(...e){l||(l=!0,t.apply(null,e))}function d(t){i=setTimeout(()=>{i=null,e(p,c())},t)}function f(){a&&clearTimeout(a)}function p(e,...t){if(l){f();return}if(e){f(),u.call(null,e,...t);return}if(c()||o){f(),u.call(null,e,...t);return}r<64&&(r*=2);let n;s===1?(s=2,n=0):n=(r+Math.random())*1e3,d(n)}let m=!1;function h(e){m||(m=!0,f(),!l&&(i===null?e||(s=1):(e||(s=2),clearTimeout(i),d(0))))}return d(0),a=setTimeout(()=>{o=!0,h(!0)},n),h}function pe(e){e(!1)}
/**
* @license
* Copyright 2017 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
function me(e){return e!==void 0}function D(e,t,n,r){if(r<t)throw w(`Invalid value for '${e}'. Expected ${t} or greater.`);if(r>n)throw w(`Invalid value for '${e}'. Expected ${n} or less.`)}function he(e){let t=encodeURIComponent,n=`?`;for(let r in e)if(e.hasOwnProperty(r)){let i=t(r)+`=`+t(e[r]);n=n+i+`&`}return n=n.slice(0,-1),n}var O;(function(e){e[e.NO_ERROR=0]=`NO_ERROR`,e[e.NETWORK_ERROR=1]=`NETWORK_ERROR`,e[e.ABORT=2]=`ABORT`})(O||={});
/**
* @license
* Copyright 2022 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
function k(e,t){let n=e>=500&&e<600,r=[408,429].indexOf(e)!==-1,i=t.indexOf(e)!==-1;return n||r||i}
/**
* @license
* Copyright 2017 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
var A=class{constructor(e,t,n,r,i,a,o,s,c,l,u,d=!0,f=!1){this.url_=e,this.method_=t,this.headers_=n,this.body_=r,this.successCodes_=i,this.additionalRetryCodes_=a,this.callback_=o,this.errorCallback_=s,this.timeout_=c,this.progressCallback_=l,this.connectionFactory_=u,this.retry=d,this.isUsingEmulator=f,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((e,t)=>{this.resolve_=e,this.reject_=t,this.start_()})}start_(){let e=(e,t)=>{if(t){e(!1,new j(!1,null,!0));return}let n=this.connectionFactory_();this.pendingConnection_=n;let r=e=>{let t=e.loaded,n=e.lengthComputable?e.total:-1;this.progressCallback_!==null&&this.progressCallback_(t,n)};this.progressCallback_!==null&&n.addUploadProgressListener(r),n.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&n.removeUploadProgressListener(r),this.pendingConnection_=null;let t=n.getErrorCode()===O.NO_ERROR,i=n.getStatus();if(!t||k(i,this.additionalRetryCodes_)&&this.retry){let t=n.getErrorCode()===O.ABORT;e(!1,new j(!1,null,t));return}let a=this.successCodes_.indexOf(i)!==-1;e(!0,new j(a,n))})},t=(e,t)=>{let n=this.resolve_,r=this.reject_,i=t.connection;if(t.wasSuccessCode)try{let e=this.callback_(i,i.getResponse());me(e)?n(e):n()}catch(e){r(e)}else if(i!==null){let e=ie();e.serverResponse=i.getErrorText(),this.errorCallback_?r(this.errorCallback_(i,e)):r(e)}else if(t.canceled){let e=this.appDelete_?T():oe();r(e)}else{let e=ae();r(e)}};this.canceled_?t(!1,new j(!1,null,!0)):this.backoffId_=fe(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&pe(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}},j=class{constructor(e,t,n){this.wasSuccessCode=e,this.connection=t,this.canceled=!!n}};function M(e,t){t!==null&&t.length>0&&(e.Authorization=`Firebase `+t)}function N(e,t){e[`X-Firebase-Storage-Version`]=`webjs/`+(t??`AppManager`)}function P(e,t){t&&(e[`X-Firebase-GMPID`]=t)}function F(e,t){t!==null&&(e[`X-Firebase-AppCheck`]=t)}function I(e,t,n,r,i,a,o=!0,s=!1){let c=he(e.urlParams),l=e.url+c,u=Object.assign({},e.headers);return P(u,t),M(u,n),N(u,a),F(u,r),new A(l,e.method,u,e.body,e.successCodes,e.additionalRetryCodes,e.handler,e.errorHandler,e.timeout,e.progressCallback,i,o,s)}
/**
* @license
* Copyright 2017 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
function L(e){if(e.length===0)return null;let t=e.lastIndexOf(`/`);return t===-1?``:e.slice(0,t)}function R(e,t){let n=t.split(`/`).filter(e=>e.length>0).join(`/`);return e.length===0?n:e+`/`+n}function ge(e){let t=e.lastIndexOf(`/`,e.length-2);return t===-1?e:e.slice(t+1)}var z=class e{constructor(e,t){this._service=e,t instanceof E?this._location=t:this._location=E.makeFromUrl(t,e.host)}toString(){return`gs://`+this._location.bucket+`/`+this._location.path}_newRef(t,n){return new e(t,n)}get root(){let e=new E(this._location.bucket,``);return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return ge(this._location.path)}get storage(){return this._service}get parent(){let t=L(this._location.path);if(t===null)return null;let n=new E(this._location.bucket,t);return new e(this._service,n)}_throwIfRoot(e){if(this._location.path===``)throw ue(e)}};function _e(e,t){let n=R(e._location.path,t),r=new E(e._location.bucket,n);return new z(e.storage,r)}function ve(e,t){if(e instanceof V){let n=e;if(n._bucket==null)throw le();let r=new z(n,n._bucket);return t==null?r:ve(r,t)}else if(t!==void 0)return _e(e,t);else return e}function B(e,t){let n=t?.[y];return n==null?null:E.makeFromBucketSpec(n,e)}var V=class{constructor(e,t,n,r,i,a=!1){this.app=e,this._authProvider=t,this._appCheckProvider=n,this._url=r,this._firebaseVersion=i,this._isUsingEmulator=a,this._bucket=null,this._host=v,this._protocol=`https`,this._appId=null,this._deleted=!1,this._maxOperationRetryTime=re,this._maxUploadRetryTime=b,this._requests=new Set,r==null?this._bucket=B(this._host,this.app.options):this._bucket=E.makeFromBucketSpec(r,this._host)}get host(){return this._host}set host(e){this._host=e,this._url==null?this._bucket=B(e,this.app.options):this._bucket=E.makeFromBucketSpec(this._url,e)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){D(`time`,0,1/0,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){D(`time`,0,1/0,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;let e=this._authProvider.getImmediate({optional:!0});if(e){let t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(s(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;let e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new z(this,e)}_makeRequest(e,t,n,r,i=!0){if(this._deleted)return new de(T());{let a=I(e,this._appId,n,r,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(a),a.getPromise().then(()=>this._requests.delete(a),()=>this._requests.delete(a)),a}}async makeRequestWithTokens(e,t){let[n,r]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,n,r).getPromise()}},H=`@firebase/storage`,U=`0.14.0`,ye=`storage`;function be(e,{instanceIdentifier:t}){let n=e.getProvider(`app`).getImmediate(),r=e.getProvider(`auth-internal`),i=e.getProvider(`app-check-internal`);return new V(n,r,i,t,ne)}function xe(){_(new e(ye,be,`PUBLIC`).setMultipleInstances(!0)),i(H,U,``),i(H,U,`esm2020`)}xe();const W=async()=>(console.warn(`Firebase not configured`),[]),G=async e=>null,K=async(e,t)=>(console.log(`🔥 saveCustomFrame called`),console.log(`📊 isFirebaseConfigured:`,!1),console.log(`📊 db:`,!1),console.log(`📊 storage:`,!1),console.error(`❌ Firebase not configured properly`),{success:!1,message:`Firebase tidak dikonfigurasi. Cek console untuk detail.`}),q=async(e,t,n=null)=>({success:!1,message:`Firebase tidak dikonfigurasi`}),J=async e=>({success:!1,message:`Firebase tidak dikonfigurasi`}),Y=async(e,t=`uses`)=>{},X=async e=>{let t=await G(e);if(!t)return null;let n=1080,r=1920;return{id:t.id,name:t.name,description:t.description,maxCaptures:t.maxCaptures,duplicatePhotos:t.duplicatePhotos||!1,imagePath:t.imagePath,frameImage:t.imagePath,thumbnailUrl:t.thumbnailUrl,slots:t.slots,designer:{elements:(t.slots||[]).map((e,t)=>({id:e.id||`photo_`+(t+1),type:`photo`,x:e.left*n,y:e.top*r,width:e.width*n,height:e.height*r,zIndex:e.zIndex||2,data:{photoIndex:e.photoIndex===void 0?t:e.photoIndex,image:null,aspectRatio:e.aspectRatio||`4:5`}}))},layout:t.layout||{aspectRatio:`9:16`,orientation:`portrait`,backgroundColor:`#ffffff`},category:t.category,isCustom:!0}},Z=async()=>({success:!1}),Q=()=>({totalMB:`Cloud`,framesMB:`Cloud`,availableMB:`Unlimited`,isNearLimit:!1,isFull:!1,isFirebase:!0}),$=async e=>K(e,null);var Se={getAllCustomFrames:W,getCustomFrameById:G,saveCustomFrame:K,updateCustomFrame:q,deleteCustomFrame:J,incrementFrameStats:Y,getCustomFrameConfig:X,addCustomFrame:$,clearAllCustomFrames:Z,getStorageInfo:Q};export{$ as addCustomFrame,Z as clearAllCustomFrames,Se as default,J as deleteCustomFrame,W as getAllCustomFrames,G as getCustomFrameById,X as getCustomFrameConfig,Q as getStorageInfo,Y as incrementFrameStats,K as saveCustomFrame,q as updateCustomFrame};