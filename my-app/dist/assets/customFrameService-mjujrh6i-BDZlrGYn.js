import{At as e,Ct as t,Dt as n,Et as r,Ft as i,It as a,Mt as o,Nt as s,Ot as c,Pt as l,St as u,Tt as d,_t as f,bt as p,gt as m,jt as h,kt as g,vt as ee,wt as te,xt as ne,yt as re}from"./index-mjujrh6i-Cu0blVQb.js";
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
var _=`firebasestorage.googleapis.com`,v=`storageBucket`,ie=120*1e3,ae=600*1e3,y=class e extends h{constructor(t,n,r=0){super(x(t),`Firebase Storage: ${n} (${x(t)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,e.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return x(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}\n${this.customData.serverResponse}`:this.message=this._baseMessage}},b;(function(e){e.UNKNOWN=`unknown`,e.OBJECT_NOT_FOUND=`object-not-found`,e.BUCKET_NOT_FOUND=`bucket-not-found`,e.PROJECT_NOT_FOUND=`project-not-found`,e.QUOTA_EXCEEDED=`quota-exceeded`,e.UNAUTHENTICATED=`unauthenticated`,e.UNAUTHORIZED=`unauthorized`,e.UNAUTHORIZED_APP=`unauthorized-app`,e.RETRY_LIMIT_EXCEEDED=`retry-limit-exceeded`,e.INVALID_CHECKSUM=`invalid-checksum`,e.CANCELED=`canceled`,e.INVALID_EVENT_NAME=`invalid-event-name`,e.INVALID_URL=`invalid-url`,e.INVALID_DEFAULT_BUCKET=`invalid-default-bucket`,e.NO_DEFAULT_BUCKET=`no-default-bucket`,e.CANNOT_SLICE_BLOB=`cannot-slice-blob`,e.SERVER_FILE_WRONG_SIZE=`server-file-wrong-size`,e.NO_DOWNLOAD_URL=`no-download-url`,e.INVALID_ARGUMENT=`invalid-argument`,e.INVALID_ARGUMENT_COUNT=`invalid-argument-count`,e.APP_DELETED=`app-deleted`,e.INVALID_ROOT_OPERATION=`invalid-root-operation`,e.INVALID_FORMAT=`invalid-format`,e.INTERNAL_ERROR=`internal-error`,e.UNSUPPORTED_ENVIRONMENT=`unsupported-environment`})(b||={});function x(e){return`storage/`+e}function oe(){return new y(b.UNKNOWN,`An unknown error occurred, please check the error payload for server response.`)}function se(){return new y(b.RETRY_LIMIT_EXCEEDED,`Max retry time for operation exceeded, please try again.`)}function ce(){return new y(b.CANCELED,`User canceled the upload/download.`)}function S(e){return new y(b.INVALID_URL,`Invalid URL '`+e+`'.`)}function le(e){return new y(b.INVALID_DEFAULT_BUCKET,`Invalid default bucket '`+e+`'.`)}function ue(){return new y(b.NO_DEFAULT_BUCKET,`No default bucket found. Did you set the '`+v+`' property when initializing the app?`)}function C(e){return new y(b.INVALID_ARGUMENT,e)}function w(){return new y(b.APP_DELETED,`The Firebase app was deleted.`)}function de(e){return new y(b.INVALID_ROOT_OPERATION,`The operation '`+e+`' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').`)}
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
var T=class e{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){let e=encodeURIComponent;return`/b/`+e(this.bucket)+`/o/`+e(this.path)}bucketOnlyServerUrl(){return`/b/`+encodeURIComponent(this.bucket)+`/o`}static makeFromBucketSpec(t,n){let r;try{r=e.makeFromUrl(t,n)}catch{return new e(t,``)}if(r.path===``)return r;throw le(t)}static makeFromUrl(t,n){let r=null,i=`([A-Za-z0-9.\\-_]+)`;function a(e){e.path.charAt(e.path.length-1)===`/`&&(e.path_=e.path_.slice(0,-1))}let o=RegExp(`^gs://`+i+`(/(.*))?$`,`i`),s={bucket:1,path:3};function c(e){e.path_=decodeURIComponent(e.path)}let l=n.replace(/[.]/g,`\\.`),u=RegExp(`^https?://${l}/v[A-Za-z0-9_]+/b/${i}/o(/([^?#]*).*)?\$`,`i`),d={bucket:1,path:3},f=n===_?`(?:storage.googleapis.com|storage.cloud.google.com)`:n,p=RegExp(`^https?://${f}/${i}/([^?#]*)`,`i`),m=[{regex:o,indices:s,postModify:a},{regex:u,indices:d,postModify:c},{regex:p,indices:{bucket:1,path:2},postModify:c}];for(let n=0;n<m.length;n++){let i=m[n],a=i.regex.exec(t);if(a){let t=a[i.indices.bucket],n=a[i.indices.path];n||=``,r=new e(t,n),i.postModify(r);break}}if(r==null)throw S(t);return r}},fe=class{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}};
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
function pe(e,t,n){let r=1,i=null,a=null,o=!1,s=0;function c(){return s===2}let l=!1;function u(...e){l||(l=!0,t.apply(null,e))}function d(t){i=setTimeout(()=>{i=null,e(p,c())},t)}function f(){a&&clearTimeout(a)}function p(e,...t){if(l){f();return}if(e){f(),u.call(null,e,...t);return}if(c()||o){f(),u.call(null,e,...t);return}r<64&&(r*=2);let n;s===1?(s=2,n=0):n=(r+Math.random())*1e3,d(n)}let m=!1;function h(e){m||(m=!0,f(),!l&&(i===null?e||(s=1):(e||(s=2),clearTimeout(i),d(0))))}return d(0),a=setTimeout(()=>{o=!0,h(!0)},n),h}function me(e){e(!1)}
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
function he(e){return e!==void 0}function E(e,t,n,r){if(r<t)throw C(`Invalid value for '${e}'. Expected ${t} or greater.`);if(r>n)throw C(`Invalid value for '${e}'. Expected ${n} or less.`)}function ge(e){let t=encodeURIComponent,n=`?`;for(let r in e)if(e.hasOwnProperty(r)){let i=t(r)+`=`+t(e[r]);n=n+i+`&`}return n=n.slice(0,-1),n}var D;(function(e){e[e.NO_ERROR=0]=`NO_ERROR`,e[e.NETWORK_ERROR=1]=`NETWORK_ERROR`,e[e.ABORT=2]=`ABORT`})(D||={});
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
function O(e,t){let n=e>=500&&e<600,r=[408,429].indexOf(e)!==-1,i=t.indexOf(e)!==-1;return n||r||i}
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
var k=class{constructor(e,t,n,r,i,a,o,s,c,l,u,d=!0,f=!1){this.url_=e,this.method_=t,this.headers_=n,this.body_=r,this.successCodes_=i,this.additionalRetryCodes_=a,this.callback_=o,this.errorCallback_=s,this.timeout_=c,this.progressCallback_=l,this.connectionFactory_=u,this.retry=d,this.isUsingEmulator=f,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((e,t)=>{this.resolve_=e,this.reject_=t,this.start_()})}start_(){let e=(e,t)=>{if(t){e(!1,new A(!1,null,!0));return}let n=this.connectionFactory_();this.pendingConnection_=n;let r=e=>{let t=e.loaded,n=e.lengthComputable?e.total:-1;this.progressCallback_!==null&&this.progressCallback_(t,n)};this.progressCallback_!==null&&n.addUploadProgressListener(r),n.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&n.removeUploadProgressListener(r),this.pendingConnection_=null;let t=n.getErrorCode()===D.NO_ERROR,i=n.getStatus();if(!t||O(i,this.additionalRetryCodes_)&&this.retry){let t=n.getErrorCode()===D.ABORT;e(!1,new A(!1,null,t));return}let a=this.successCodes_.indexOf(i)!==-1;e(!0,new A(a,n))})},t=(e,t)=>{let n=this.resolve_,r=this.reject_,i=t.connection;if(t.wasSuccessCode)try{let e=this.callback_(i,i.getResponse());he(e)?n(e):n()}catch(e){r(e)}else if(i!==null){let e=oe();e.serverResponse=i.getErrorText(),this.errorCallback_?r(this.errorCallback_(i,e)):r(e)}else if(t.canceled){let e=this.appDelete_?w():ce();r(e)}else{let e=se();r(e)}};this.canceled_?t(!1,new A(!1,null,!0)):this.backoffId_=pe(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&me(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}},A=class{constructor(e,t,n){this.wasSuccessCode=e,this.connection=t,this.canceled=!!n}};function j(e,t){t!==null&&t.length>0&&(e.Authorization=`Firebase `+t)}function M(e,t){e[`X-Firebase-Storage-Version`]=`webjs/`+(t??`AppManager`)}function N(e,t){t&&(e[`X-Firebase-GMPID`]=t)}function P(e,t){t!==null&&(e[`X-Firebase-AppCheck`]=t)}function F(e,t,n,r,i,a,o=!0,s=!1){let c=ge(e.urlParams),l=e.url+c,u=Object.assign({},e.headers);return N(u,t),j(u,n),M(u,a),P(u,r),new k(l,e.method,u,e.body,e.successCodes,e.additionalRetryCodes,e.handler,e.errorHandler,e.timeout,e.progressCallback,i,o,s)}
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
function I(e){if(e.length===0)return null;let t=e.lastIndexOf(`/`);return t===-1?``:e.slice(0,t)}function L(e,t){let n=t.split(`/`).filter(e=>e.length>0).join(`/`);return e.length===0?n:e+`/`+n}function R(e){let t=e.lastIndexOf(`/`,e.length-2);return t===-1?e:e.slice(t+1)}var z=class e{constructor(e,t){this._service=e,t instanceof T?this._location=t:this._location=T.makeFromUrl(t,e.host)}toString(){return`gs://`+this._location.bucket+`/`+this._location.path}_newRef(t,n){return new e(t,n)}get root(){let e=new T(this._location.bucket,``);return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return R(this._location.path)}get storage(){return this._service}get parent(){let t=I(this._location.path);if(t===null)return null;let n=new T(this._location.bucket,t);return new e(this._service,n)}_throwIfRoot(e){if(this._location.path===``)throw de(e)}};function _e(e,t){let n=L(e._location.path,t),r=new T(e._location.bucket,n);return new z(e.storage,r)}function ve(e,t){if(e instanceof V){let n=e;if(n._bucket==null)throw ue();let r=new z(n,n._bucket);return t==null?r:ve(r,t)}else if(t!==void 0)return _e(e,t);else return e}function B(e,t){let n=t?.[v];return n==null?null:T.makeFromBucketSpec(n,e)}var V=class{constructor(e,t,n,r,i,a=!1){this.app=e,this._authProvider=t,this._appCheckProvider=n,this._url=r,this._firebaseVersion=i,this._isUsingEmulator=a,this._bucket=null,this._host=_,this._protocol=`https`,this._appId=null,this._deleted=!1,this._maxOperationRetryTime=ie,this._maxUploadRetryTime=ae,this._requests=new Set,r==null?this._bucket=B(this._host,this.app.options):this._bucket=T.makeFromBucketSpec(r,this._host)}get host(){return this._host}set host(e){this._host=e,this._url==null?this._bucket=B(e,this.app.options):this._bucket=T.makeFromBucketSpec(this._url,e)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){E(`time`,0,1/0,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){E(`time`,0,1/0,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;let e=this._authProvider.getImmediate({optional:!0});if(e){let t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(n(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;let e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new z(this,e)}_makeRequest(e,t,n,r,i=!0){if(this._deleted)return new fe(w());{let a=F(e,this._appId,n,r,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(a),a.getPromise().then(()=>this._requests.delete(a),()=>this._requests.delete(a)),a}}async makeRequestWithTokens(e,t){let[n,r]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,n,r).getPromise()}},H=`@firebase/storage`,U=`0.14.0`,ye=`storage`;function be(e,{instanceIdentifier:t}){let n=e.getProvider(`app`).getImmediate(),i=e.getProvider(`auth-internal`),a=e.getProvider(`app-check-internal`);return new V(n,i,a,t,r)}function xe(){c(new e(ye,be,`PUBLIC`).setMultipleInstances(!0)),g(H,U,``),g(H,U,`esm2020`)}xe();const W=async()=>(console.warn(`Firebase not configured`),[]),G=async e=>null,K=async(e,t)=>(console.log(`🔥 saveCustomFrame called`),console.log(`📊 isFirebaseConfigured:`,!1),console.log(`📊 db:`,!1),console.log(`📊 storage:`,!1),console.error(`❌ Firebase not configured properly`),{success:!1,message:`Firebase tidak dikonfigurasi. Cek console untuk detail.`}),q=async(e,t,n=null)=>({success:!1,message:`Firebase tidak dikonfigurasi`}),J=async e=>({success:!1,message:`Firebase tidak dikonfigurasi`}),Y=async(e,t=`uses`)=>{},X=async e=>{let t=await G(e);if(!t)return null;let n=1080,r=1920;return{id:t.id,name:t.name,description:t.description,maxCaptures:t.maxCaptures,duplicatePhotos:t.duplicatePhotos||!1,imagePath:t.imagePath,frameImage:t.imagePath,thumbnailUrl:t.thumbnailUrl,slots:t.slots,designer:{elements:(t.slots||[]).map((e,t)=>({id:e.id||`photo_`+(t+1),type:`photo`,x:e.left*n,y:e.top*r,width:e.width*n,height:e.height*r,rotation:Number.isFinite(e.rotation)?e.rotation:0,zIndex:e.zIndex||2,data:{photoIndex:e.photoIndex===void 0?t:e.photoIndex,image:null,aspectRatio:e.aspectRatio||`4:5`}}))},layout:t.layout||{aspectRatio:`9:16`,orientation:`portrait`,backgroundColor:`#ffffff`},category:t.category,isCustom:!0}},Z=async()=>({success:!1}),Q=()=>({totalMB:`Cloud`,framesMB:`Cloud`,availableMB:`Unlimited`,isNearLimit:!1,isFull:!1,isFirebase:!0}),$=async e=>K(e,null);var Se={getAllCustomFrames:W,getCustomFrameById:G,saveCustomFrame:K,updateCustomFrame:q,deleteCustomFrame:J,incrementFrameStats:Y,getCustomFrameConfig:X,addCustomFrame:$,clearAllCustomFrames:Z,getStorageInfo:Q};export{$ as addCustomFrame,Z as clearAllCustomFrames,Se as default,J as deleteCustomFrame,W as getAllCustomFrames,G as getCustomFrameById,X as getCustomFrameConfig,Q as getStorageInfo,Y as incrementFrameStats,K as saveCustomFrame,q as updateCustomFrame};