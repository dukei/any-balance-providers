/*! AnyBalance Library (http://any-balance-providers.googlecode.com)
The uncompressed full source code of this library is here: https://code.google.com/p/any-balance-providers/source/browse/trunk/extra/development/ab-test-library/library.js
*/
;
function getParam(f,k,b,g,c,a){if(!isset(f)){AnyBalance.trace("param1 is unset! "+new Error().stack);
return
}if(!isAvailable(b)){AnyBalance.trace(b+" is disabled!");
return
}var h=isArray(g)?g:[g];
for(var d=0;
d<h.length;
++d){g=h[d];
var e=g?f.match(g):[,f],j;
if(e){j=replaceAll(isset(e[1])?e[1]:e[0],c);
if(a){j=a(j)
}if(b&&isset(j)){k[isArray(b)?b[0]:b]=j
}break
}}return j
}function checkEmpty(c,b,a){if(!c){throw new AnyBalance.Error(b,null,!a)
}}function isAvailable(c){if(!c){return true
}var b=isArray(c),a="__tariff";
if((b&&c.indexOf(a)>=0)||(!b&&c=="__tariff")){return true
}return AnyBalance.isAvailable(c)
}var replaceTagsAndSpaces=[/&nbsp;/ig," ",/&minus;/ig,"-",/<!--[\s\S]*?-->/g,"",/<[^>]*>/g," ",/\s{2,}/g," ",/^\s+|\s+$/g,""];
var replaceFloat=[/&minus;/ig,"-",/\s+/g,"",/'/g,"",/,/g,".",/\.([^.]*)(?=\.)/g,"$1",/^\./,"0."];
var replaceSlashes=[/\\(.?)/g,function(a,b){switch(b){case"0":return"\0";
case"":return"";
default:return b
}}];
function isset(a){return typeof(a)!="undefined"
}function isArray(a){return Object.prototype.toString.call(a)==="[object Array]"
}function replaceAll(c,a){for(var b=0;
a&&b<a.length;
++b){if(isArray(a[b])){c=replaceAll(c,a[b])
}else{c=c.replace(a[b],a[b+1]);
++b
}}return c
}function parseBalance(b){var a=getParam(html_entity_decode(b).replace(/\s+/g,""),null,null,/(-?[.,]?\d[\d'.,]*)/,replaceFloat,parseFloat);
AnyBalance.trace("Parsing balance ("+a+") from: "+b);
return a
}function parseCurrency(b){var a=getParam(html_entity_decode(b).replace(/\s+/g,""),null,null,/-?\d[\d.,]*(\S*)/);
AnyBalance.trace("Parsing currency ("+a+") from: "+b);
return a
}function parseMinutes(e){var g=html_entity_decode(e).replace(/[\s�]+/g,"");
var a=0,c=0,d=0;
if(/^\d+:\d+:\d+$/i.test(g)){var b=/^(\d+):(\d+):(\d+)$/i.exec(g);
a=parseFloat(b[1]);
c=parseFloat(b[2]);
d=parseFloat(b[3])
}else{if(/^\d+:\d+/i.test(g)){var b=/^(\d+):(\d+)/i.exec(g);
a=0;
c=parseFloat(b[1]);
d=parseFloat(b[2])
}else{a=getParam(g,null,null,/(-?\d[\d.,]*)\s*(?:час|ч|hour|h)/i,replaceFloat,parseFloat)||0;
c=getParam(g,null,null,[/(-?\d[\d.,]*)\s*(?:мин|м|хв|min|m)/i,/^-?[\d.,]+$/i],replaceFloat,parseFloat)||0;
d=getParam(g,null,null,/(-?\d[\d.,]*)\s*(?:сек|c|с|sec|s)/i,replaceFloat,parseFloat)||0
}}var f=(a*3600)+(c*60)+d;
AnyBalance.trace("Parsed seconds ("+f+") from: "+e);
return f
}function html_entity_decode(a){var c=get_html_translation_table();
var b=a.replace(/&(#(x)?)?(\w+);/ig,function(g,f,e,d){if(!f){var h=d.toLowerCase(d);
if(c.hasOwnProperty(h)){return String.fromCharCode(c[h])
}}else{if(!e){if(/^\d+$/.test(d)){return String.fromCharCode(parseInt(d))
}}else{if(/^[0-9a-f]+$/i.test(d)){return String.fromCharCode(parseInt(d,16))
}}}return g
});
return b
}function get_html_translation_table(){var a={amp:38,nbsp:160,iexcl:161,cent:162,pound:163,curren:164,yen:165,brvbar:166,sect:167,uml:168,copy:169,ordf:170,laquo:171,not:172,shy:173,reg:174,macr:175,deg:176,plusmn:177,sup2:178,sup3:179,acute:180,micro:181,para:182,middot:183,cedil:184,sup1:185,ordm:186,raquo:187,frac14:188,frac12:189,frac34:190,iquest:191,agrave:192,aacute:193,acirc:194,atilde:195,auml:196,aring:197,aelig:198,ccedil:199,egrave:200,eacute:201,ecirc:202,euml:203,igrave:204,iacute:205,icirc:206,iuml:207,eth:208,ntilde:209,ograve:210,oacute:211,ocirc:212,otilde:213,ouml:214,times:215,oslash:216,ugrave:217,uacute:218,ucirc:219,uuml:220,yacute:221,thorn:222,szlig:223,agrave:224,aacute:225,acirc:226,atilde:227,auml:228,aring:229,aelig:230,ccedil:231,egrave:232,eacute:233,ecirc:234,euml:235,igrave:236,iacute:237,icirc:238,iuml:239,eth:240,ntilde:241,ograve:242,oacute:243,ocirc:244,otilde:245,ouml:246,divide:247,oslash:248,ugrave:249,uacute:250,ucirc:251,uuml:252,yacute:253,thorn:254,yuml:255,quot:34,lt:60,gt:62};
return a
}function createFormParams(a,b,d){var c=d?[]:{};
a.replace(/<input[^>]+name=['"]([^'"]*)['"][^>]*>|<select[^>]+name=['"]([^'"]*)['"][^>]*>[\s\S]*?<\/select>/ig,function(i,f,g){var e="";
if(f){if(/type=['"]button['"]/i.test(i)){e=undefined
}else{e=getParam(i,null,null,/value=['"]([^'"]*)['"]/i,null,html_entity_decode)||""
}name=f
}else{if(g){e=getParam(i,null,null,/^<[^>]*value=['"]([^'"]*)['"]/i,null,html_entity_decode);
if(typeof(e)=="undefined"){var h=getParam(i,null,null,/(<option[^>]+selected[^>]*>)/i);
if(!h){h=getParam(i,null,null,/(<option[^>]*>)/i)
}if(h){e=getParam(h,null,null,/value=['"]([^'"]*)["']/i,null,html_entity_decode)
}}name=g
}}name=html_entity_decode(name);
if(b){e=b(c,i,name,e)
}if(typeof(e)!="undefined"){if(d){c.push([name,e])
}else{c[name]=e
}}});
return c
}function parseDate(e){var c=/(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(e);
if(c){var b=+c[3];
var a=new Date(b<1000?2000+b:b,c[2]-1,+(c[1]||1),c[4]||0,c[5]||0,c[6]||0);
var d=a.getTime();
AnyBalance.trace("Parsing date "+a+" from value: "+e);
return d
}AnyBalance.trace("Failed to parse date from value: "+e)
}function parseDateWord(a){AnyBalance.trace("Trying to parse date from "+a);
return getParam(a,null,null,null,[replaceTagsAndSpaces,/\D*(?:январ(?:я|ь)|янв|january|jan)\D*/i,".01.",/\D*(?:феврал(?:я|ь)|фев|febrary|feb)\D*/i,".02.",/\D*(?:марта|март|мар|march|mar)\D*/i,".03.",/\D*(?:апрел(?:я|ь)|апр|april|apr)\D*/i,".04.",/\D*(?:ма(?:я|й)|may)\D*/i,".05.",/\D*(?:июн(?:я|ь)|июн|june|jun)\D*/i,".06.",/\D*(?:июл(?:я|ь)|июл|july|jul)\D*/i,".07.",/\D*(?:августа|август|авг|august|aug)\D*/i,".08.",/\D*(?:сентябр(?:я|ь)|сен|september|sep)\D*/i,".09.",/\D*(?:октябр(?:я|ь)|окт|october|oct)\D*/i,".10.",/\D*(?:ноябр(?:я|ь)|ноя|november|nov)\D*/i,".11.",/\D*(?:декабр(?:я|ь)|dec|december|dec)\D*/i,".12.",/\s/g,""],parseDate)
}function joinObjects(c,a){var d={};
for(var b in a){d[b]=a[b]
}if(c){for(b in c){d[b]=c[b]
}}return d
}function joinArrays(c,b){var a=c.slice();
a.push.apply(a,b);
return a
}function addHeaders(c,e){e=e||g_headers;
var d=isArray(e);
var a=isArray(c);
if(!d&&!a){return joinObjects(c,e)
}if(d&&a){return joinArrays(e,c)
}if(!d&&a){var f=joinObjects(null,e);
for(var b=0;
b<c.length;
++b){f[c[b][0]]=c[b][1]
}return f
}if(d&&!a){var f=e.slice();
for(b in c){f.push([b,c[b]])
}return f
}}function getJson(b){try{var a=JSON.parse(b);
return a
}catch(c){AnyBalance.trace("Bad json ("+c.message+"): "+b);
throw new AnyBalance.Error("Сервер вернул ошибочные данные: "+c.message)
}}function getJsonEval(b){try{var a=safeEval("return "+b,"window,document,self");
return a
}catch(c){AnyBalance.trace("Bad json ("+c.message+"): "+b);
throw new AnyBalance.Error("Сервер вернул ошибочные данные: "+c.message)
}}function safeEval(c,g,i){var d=AnyBalance,b=this.g_AnyBalanceApiParams,f=this._AnyBalanceApi;
AnyBalance=this.g_AnyBalanceApiParams=this._AnyBalanceApi=undefined;
try{var a=Function(g||"ja0w4yhwphgawht984h","AnyBalance","g_AnyBalanceApiParams","_AnyBalanceApi",c).apply(null,i);
return a
}catch(h){throw new d.Error("Bad javascript ("+h.message+"): "+c)
}finally{AnyBalance=d,g_AnyBalanceApiParams=b,_AnyBalanceApi=f
}}function endsWith(b,a){return b.indexOf(a,b.length-a.length)!==-1
}(function(b,d){var c=b.parse,a=[1,4,5,6,7,10,11];
b.parse=function(f){var j,l,h=0;
if((l=/^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(f))){for(var g=0,e;
(e=a[g]);
++g){l[e]=+l[e]||0
}l[2]=(+l[2]||1)-1;
l[3]=+l[3]||1;
if(l[8]!=="Z"&&l[9]!==d){h=l[10]*60+l[11];
if(l[9]==="+"){h=0-h
}}j=b.UTC(l[1],l[2],l[3],l[4],l[5]+h,l[6],l[7])
}else{j=c?c(f):NaN
}return j
}
}(Date));
function parseDateISO(b){var a=Date.parse(b);
if(!a){AnyBalance.trace("Could not parse date from "+b);
return
}else{AnyBalance.trace("Parsed "+new Date(a)+" from "+b);
return a
}}function parseDateJS(b){var c=b.replace(/(\d+)\s*г(?:\.|ода?)?,?/i,"$1 ");
var a=Date.parse(c);
if(!a){AnyBalance.trace("Can not parse date from "+b);
return
}a=new Date(a);
AnyBalance.trace("Parsed date "+a.toString()+" from "+b);
return a.getTime()
}function sumParam(k,q,d,n,e,b,f,c){if(typeof(f)=="function"){var a=c;
c=f;
f=a||false
}function p(){if(f){return n?k.replace(n,""):""
}}if(!isAvailable(d)){return p()
}d=isArray(d)?d[0]:d;
var o=[],j;
if(d&&isset(q[d])){o.push(q[d])
}function l(i){i=replaceAll(i,e);
if(b){i=b(i)
}if(isset(i)){o.push(i)
}}var m=isArray(n)?n:[n];
for(var g=0;
g<m.length;
++g){n=m[g];
if(!n){l(k)
}else{n.lastIndex=0;
while(j=n.exec(k)){l(isset(j[1])?j[1]:j[0]);
if(!n.global){break
}}}if(f){k=n?k.replace(n,""):""
}}var h;
if(c){h=c(o)
}else{if(!d){h=o
}}if(d){if(isset(h)){q[d]=h
}return k
}else{return h
}}function aggregate_sum(a){if(a.length==0){return
}var c=0;
for(var b=0;
b<a.length;
++b){c+=a[b]
}return c
}function aggregate_join(b,a,d){if(b.length==0){return
}if(!isset(a)){a=", "
}var c=b.join(a);
if(!d){c=c.replace(/^(?:\s*,\s*)+|(?:\s*,\s*){2,}|(?:\s*,\s*)+$/g,"")
}return c
}function create_aggregate_join(a,b){return function(c){return aggregate_join(c,a,b)
}
}function aggregate_min(a){if(a.length==0){return
}var c;
for(var b=0;
b<a.length;
++b){if(!isset(c)||c>a[b]){c=a[b]
}}return c
}function aggregate_max(a){if(a.length==0){return
}var c;
for(var b=0;
b<a.length;
++b){if(!isset(c)||c<a[b]){c=a[b]
}}return c
}function parseTraffic(b,a){return parseTrafficEx(b,1024,2,a)
}function parseTrafficGb(b,a){return parseTrafficEx(b,1024,3,a)
}function parseTrafficEx(h,i,b,d){var g=html_entity_decode(h.replace(/\s+/g,""));
var a=getParam(g,null,null,/(-?\.?\d[\d\.,]*)/,replaceFloat,parseFloat);
if(!isset(a)||a===""){AnyBalance.trace("Could not parse traffic value from "+h);
return
}var f=getParam(g,null,null,/([kmgtкмгт][бb]?|[бb](?![\wа-я])|байт|bytes)/i);
if(!f&&!d){AnyBalance.trace("Could not parse traffic units from "+h);
return
}if(!f){f=d
}switch(f.substr(0,1).toLowerCase()){case"b":case"б":a=Math.round(a/Math.pow(i,b)*100)/100;
break;
case"k":case"к":a=Math.round(a/Math.pow(i,b-1)*100)/100;
break;
case"m":case"м":a=Math.round(a/Math.pow(i,b-2)*100)/100;
break;
case"g":case"г":a=Math.round(a/Math.pow(i,b-3)*100)/100;
break;
case"t":case"т":a=Math.round(a/Math.pow(i,b-4)*100)/100;
break
}var e=""+a;
if(e.length>6){a=Math.round(a)
}else{if(e.length>5){a=Math.round(a*10)/10
}}var c={0:"b",1:"kb",2:"mb",3:"gb",4:"tb"};
AnyBalance.trace("Parsing traffic ("+a+c[b]+") from: "+h);
return a
}function requestPostMultipart(c,h,e){var k="",g="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
for(var j=0;
j<16;
j++){k+=g.charAt(Math.floor(Math.random()*g.length))
}var f=[];
var d="------WebKitFormBoundary"+k;
for(var a in h){f.push(d,'Content-Disposition: form-data; name="'+a+'"',"",h[a])
}f.push(d+"--\r\n");
if(!e){e={}
}e["Content-Type"]="multipart/form-data; boundary="+d.substr(2);
return AnyBalance.requestPost(c,f.join("\r\n"),e)
};