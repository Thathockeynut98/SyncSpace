// Reports shapes only. This module never normalizes, decrypts, or rewrites data.
export function encodingShape(value,expectedBytes){
 if(typeof value!=='string')return {category:'missing-or-nonstring',length:null};
 const length=value.length;
 if(!length)return {category:'empty',length};
 if(value.length%4===0&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)){
  const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value)return {category:'noncanonical-base64',length};
  return {category:expectedBytes&&bytes.length!==expectedBytes?'unexpected-byte-length':'standard-base64',length,bytes:bytes.length};
 }
 if(/^data:[^,]+;base64,/.test(value))return {category:'data-url-shape-unverified',length};
 if(/^".*"$/.test(value))return {category:'quoted-string-shape-unverified',length};
 if(/\s/.test(value))return {category:'contains-whitespace-unverified',length};
 if(/^[A-Za-z0-9_-]+={0,2}$/.test(value)&&/[-_]/.test(value))return {category:'base64url-shape-unverified',length};
 if(/^[A-Za-z0-9+/]+$/.test(value)&&length%4)return {category:'unpadded-base64-shape-unverified',length};
 return {category:'invalid-base64-shape',length};
}
