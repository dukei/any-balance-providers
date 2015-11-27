/*! AnyBalance Library (http://any-balance-providers.googlecode.com)
The uncompressed full source code of this library is here: https://code.google.com/p/any-balance-providers/source/browse/trunk/extra/development/ab-test-library/library.js
*/
;
function getParam(f,k,b,g,c,a){if(!isset(f)){AnyBalance.trace("getParam: input "+(b?"("+b+")":"")+" is unset! "+new Error().stack);
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
}if(b&&isset(j)){k[__getParName(b)]=j
}break
}}return j
}function checkEmpty(c,b,a){if(!c){throw new AnyBalance.Error(b,null,!a)
}}function __getParName(b){var a=isArray(b)?b[0]:b;
return a&&a.substr(a.lastIndexOf(".")+1)
}function isAvailable(a){if(!a){return true
}if(/\b__/.test(a.toString())){return true
}return AnyBalance.isAvailable(a)
}var replaceTagsAndSpaces=[/&nbsp;/ig," ",/&minus;/ig,"-",/<!--[\s\S]*?-->/g,"",/<[^>]*>/g," ",/\s{2,}/g," ",/^\s+|\s+$/g,""],replaceFloat=[/&minus;/ig,"-",/\s+/g,"",/'/g,"",/,/g,".",/\.([^.]*)(?=\.)/g,"$1",/^\./,"0."],replaceSlashes=[/\\(.?)/g,function(a,b){switch(b){case"0":return"\0";
case"":return"";
default:return b
}}],replaceHtmlEntities=[/&(#(x)?)?(\w+);/ig,make_html_entity_replacement];
function isset(a){return typeof(a)!="undefined"
}function isArray(a){return Object.prototype.toString.call(a)==="[object Array]"
}function replaceAll(c,a){for(var b=0;
a&&b<a.length;
++b){if(isArray(a[b])){c=replaceAll(c,a[b])
}else{c=c.replace(a[b],a[b+1]);
++b
}}return c
}function parseBalance(c,a){var b=getParam(html_entity_decode(c).replace(/\s+/g,""),null,null,/(-?[.,]?\d[\d'.,]*)/,replaceFloat,parseFloat);
if(!a){AnyBalance.trace("Parsing balance ("+b+") from: "+c)
}return b
}function parseBalanceSilent(a){return parseBalance(a,true)
}function parseCurrency(b){var a=getParam(html_entity_decode(b).replace(/\s+/g,""),null,null,/-?\d[\d.,]*(\S*)/);
AnyBalance.trace("Parsing currency ("+a+") from: "+b);
return a
}function parseMinutes(f,b){var h=html_entity_decode(f).replace(/[\s�]+/g,"");
var a=0,d=0,e=0;
if(/^\d+:\d+:\d+$/i.test(h)){var c=/^(\d+):(\d+):(\d+)$/i.exec(h);
a=parseFloat(c[1]);
d=parseFloat(c[2]);
e=parseFloat(c[3])
}else{if(/^\d+:\d+/i.test(h)){var c=/^(\d+):(\d+)/i.exec(h);
a=0;
d=parseFloat(c[1]);
e=parseFloat(c[2])
}else{a=getParam(h,null,null,/(-?\d[\d.,]*)\s*(?:час|ч|hour|h)/i,replaceFloat,parseFloat)||0;
d=getParam(h,null,null,[/(-?\d[\d.,]*)\s*(?:мин|м|хв|min|m)/i,/^-?[\d.,]+$/i],replaceFloat,parseFloat)||0;
e=getParam(h,null,null,/(-?\d[\d.,]*)\s*(?:сек|c|с|sec|s)/i,replaceFloat,parseFloat)||0
}}var g=(a*3600)+(d*60)+e;
if(!b){AnyBalance.trace("Parsed seconds ("+g+") from: "+f)
}return g
}function parseMinutesSilent(a){return parseMinutes(a,true)
}function html_entity_decode(a){return replaceAll(a,replaceHtmlEntities)
}function make_html_entity_replacement(e,c,b,a){var d={amp:38,nbsp:160,iexcl:161,cent:162,pound:163,curren:164,yen:165,brvbar:166,sect:167,uml:168,copy:169,ordf:170,laquo:171,not:172,shy:173,reg:174,macr:175,deg:176,plusmn:177,sup2:178,sup3:179,acute:180,micro:181,para:182,middot:183,cedil:184,sup1:185,ordm:186,raquo:187,frac14:188,frac12:189,frac34:190,iquest:191,agrave:192,aacute:193,acirc:194,atilde:195,auml:196,aring:197,aelig:198,ccedil:199,egrave:200,eacute:201,ecirc:202,euml:203,igrave:204,iacute:205,icirc:206,iuml:207,eth:208,ntilde:209,ograve:210,oacute:211,ocirc:212,otilde:213,ouml:214,times:215,oslash:216,ugrave:217,uacute:218,ucirc:219,uuml:220,yacute:221,thorn:222,szlig:223,agrave:224,aacute:225,acirc:226,atilde:227,auml:228,aring:229,aelig:230,ccedil:231,egrave:232,eacute:233,ecirc:234,euml:235,igrave:236,iacute:237,icirc:238,iuml:239,eth:240,ntilde:241,ograve:242,oacute:243,ocirc:244,otilde:245,ouml:246,divide:247,oslash:248,ugrave:249,uacute:250,ucirc:251,uuml:252,yacute:253,thorn:254,yuml:255,quot:34,lt:60,gt:62};
if(!c){var f=a.toLowerCase(a);
if(d.hasOwnProperty(f)){return String.fromCharCode(d[f])
}}else{if(!b){if(/^\d+$/.test(a)){return String.fromCharCode(parseInt(a))
}}else{if(/^[0-9a-f]+$/i.test(a)){return String.fromCharCode(parseInt(a,16))
}}}return e
}function createFormParams(k,b,l){var g=l?[]:{},j=/value\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)/i,m=[/^"([^"]*)"$|^'([^']*)'$/,"$1$2"],a,q=/<input[^>]+name\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)[^>]*>|<select[^>]+name\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)[^>]*>[\s\S]*?<\/select>/ig,h=null;
while(true){var f=q.exec(k);
if(!f){break
}var n=f[0],e=f[1],o=f[2],p="";
if(e){if(/type\s*=\s*['"]?button['"]?/i.test(n)){p=undefined
}else{if(/type\s*=\s*['"]?checkbox['"]?/i.test(n)){p=/[^\w\-]checked[^\w\-]/i.test(n)?getParam(n,h,h,j,m,html_entity_decode)||"on":undefined
}else{p=getParam(n,h,h,j,m,html_entity_decode)||""
}}a=replaceAll(e,m)
}else{if(o){var c=getParam(n,h,h,/^<[^>]*>/i);
p=getParam(c,h,h,j,m,html_entity_decode);
if(typeof(p)=="undefined"){var d=getParam(n,h,h,/(<option[^>]+selected[^>]*>)/i);
if(!d){d=getParam(n,h,h,/(<option[^>]*>)/i)
}if(d){p=getParam(d,h,h,j,m,html_entity_decode)
}}a=replaceAll(o,m)
}}a=html_entity_decode(a);
if(b){p=b(g,n,a,p)
}if(typeof(p)!="undefined"){if(l){g.push([a,p])
}else{g[a]=p
}}}return g
}function parseDate(f,a){var d=/(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(f);
if(d){var c=+d[3];
var b=new Date(c<1000?2000+c:c,d[2]-1,+(d[1]||1),d[4]||0,d[5]||0,d[6]||0);
var e=b.getTime();
if(!a){AnyBalance.trace("Parsing date "+b+" from value: "+f)
}return e
}if(!a){AnyBalance.trace("Failed to parse date from value: "+f)
}}function parseDateSilent(a){return parseDate(a,true)
}function parseDateWord(b){AnyBalance.trace("Trying to parse date from "+b);
var a=replaceAll(b,[replaceTagsAndSpaces,replaceHtmlEntities,/\D*(?:январ(?:я|ь)|янв|january|jan)\D*/i,".01.",/\D*(?:феврал(?:я|ь)|фев|febrary|feb)\D*/i,".02.",/\D*(?:марта|март|мар|march|mar)\D*/i,".03.",/\D*(?:апрел(?:я|ь)|апр|april|apr)\D*/i,".04.",/\D*(?:ма(?:я|й)|may)\D*/i,".05.",/\D*(?:июн(?:я|ь)|июн|june|jun)\D*/i,".06.",/\D*(?:июл(?:я|ь)|июл|july|jul)\D*/i,".07.",/\D*(?:августа|август|авг|august|aug)\D*/i,".08.",/\D*(?:сентябр(?:я|ь)|сен|september|sep)\D*/i,".09.",/\D*(?:октябр(?:я|ь)|окт|october|oct)\D*/i,".10.",/\D*(?:ноябр(?:я|ь)|ноя|november|nov)\D*/i,".11.",/\D*(?:декабр(?:я|ь)|dec|december|dec)\D*/i,".12.",/\s/g,""]);
if(endsWith(a,".")){a+=new Date().getFullYear()
}return parseDate(a)
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
}}function safeEval(c,g,j){var d=AnyBalance,b=this.g_AnyBalanceApiParams,f=this._AnyBalanceApi;
AnyBalance=this.g_AnyBalanceApiParams=this._AnyBalanceApi=undefined;
try{var a=Function(g||"ja0w4yhwphgawht984h","AnyBalance","g_AnyBalanceApiParams","_AnyBalanceApi",c).apply(null,j);
return a
}catch(h){throw new d.Error("Bad javascript ("+h.message+"): "+c)
}finally{AnyBalance=d,g_AnyBalanceApiParams=b,_AnyBalanceApi=f
}}function endsWith(b,a){return b.indexOf(a,b.length-a.length)!==-1
}(function(b,d){var c=b.parse,a=[1,4,5,6,7,10,11];
b.parse=function(f){var j,l,h=0;
if((l=/^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3})\d*)?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(f))){for(var g=0,e;
(e=a[g]);
++g){l[e]=+l[e]||0
}l[2]=(+l[2]||1)-1;
l[3]=+l[3]||1;
if(l[8]!=="Z"&&l[9]!==d){h=l[10]*60+l[11];
if(l[9]==="+"){h=0-h
}}j=b.UTC(l[1],l[2],l[3],l[4],l[5]+h,l[6],l[7]);
b.lastParse="custom"
}else{j=c?c(f):NaN;
b.lastParse="original"
}return j
}
}(Date));
function parseDateISO(b){var a=Date.parse(b);
if(!a){AnyBalance.trace("Could not parse ("+Date.lastParse+") date from "+b);
return
}else{AnyBalance.trace("Parsed ("+Date.lastParse+") "+new Date(a)+" from "+b);
return a
}}function parseDateJS(b){var c=b.replace(/(\d+)\s*г(?:\.|ода?)?,?/i,"$1 ");
var a=Date.parse(c);
if(!a){AnyBalance.trace("Can not parse date from "+b);
return
}a=new Date(a);
AnyBalance.trace("Parsed date "+a.toString()+" from "+b);
return a.getTime()
}function sumParam(k,q,d,n,e,b,f,c){if(!isset(k)){AnyBalance.trace("sumParam: input "+(d?"("+d+")":"")+" is unset! "+new Error().stack);
return
}if(typeof(f)=="function"){var a=c;
c=f;
f=a||false
}function p(){if(f){return n?k.replace(n,""):""
}}if(!isAvailable(d)){AnyBalance.trace(d+" is disabled!");
return p()
}d=__getParName(d);
var o=[],j;
if(d&&isset(q[d])){o.push(q[d])
}function l(r){r=replaceAll(r,e);
if(b){r=b(r)
}if(isset(r)){o.push(r)
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
if(!d){a=a.trim().replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1");
c=c.replace(new RegExp("^(?:\\s*"+a+"\\s*)+|(?:\\s*"+a+"]\\s*){2,}|(?:\\s*"+a+"\\s*)+$","g"),"")
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
}function parseTrafficEx(h,j,b,d){var g=html_entity_decode(h.replace(/\s+/g,""));
var a=getParam(g,null,null,/(-?\.?\d[\d\.,]*)/,replaceFloat,parseFloat);
if(!isset(a)||a===""){AnyBalance.trace("Could not parse traffic value from "+h);
return
}var f=getParam(g,null,null,/([kmgtкмгт][бb]?|[бb](?![\wа-я])|байт|bytes)/i);
if(!f&&!d){AnyBalance.trace("Could not parse traffic units from "+h);
return
}if(!f){f=d
}switch(f.substr(0,1).toLowerCase()){case"b":case"б":a=Math.round(a/Math.pow(j,b)*100)/100;
break;
case"k":case"к":a=Math.round(a/Math.pow(j,b-1)*100)/100;
break;
case"m":case"м":a=Math.round(a/Math.pow(j,b-2)*100)/100;
break;
case"g":case"г":a=Math.round(a/Math.pow(j,b-3)*100)/100;
break;
case"t":case"т":a=Math.round(a/Math.pow(j,b-4)*100)/100;
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
}function capitalFirstLetters(c){var a=html_entity_decode(c+"").toLowerCase().split(" ");
var b="";
for(i=0;
i<a.length;
i++){b+=a[i].substring(0,1).toUpperCase()+a[i].substring(1)+" "
}return b.replace(/^\s+|\s+$/g,"")
}function setCountersToNull(b){var a=AnyBalance.getAvailableCounters();
for(var c=0;
c<a.length;
++c){if(a[c]!=="--auto--"&&!isset(b[a[c]])){b[a[c]]=null
}}if(!isset(b.__tariff)){b.__tariff=null
}}function getElement(j,n,e,a){var c=n.exec(j);
if(!c){return
}var l=c.index;
var m=j.substr(l,c[0].length);
var d=getParam(m,null,null,/<(\w+)/);
var f=new RegExp("(?:<"+d+"|</"+d+")[^>]*>","ig");
f.lastIndex=l+c[0].length;
var g=0;
while(true){c=f.exec(j);
if(!c){break
}var b=c[0];
if(b.charAt(1)=="/"){if(g==0){break
}--g
}else{++g
}f.lastIndex=c.index+b.length
}var h=j.length;
if(c){h=c.index+c[0].length
}n.lastIndex=h;
var k=j.substring(l,h);
if(e){k=replaceAll(k,e)
}if(a){k=a(k)
}return k
}function getElements(e,k,b,a){var d=[];
var g=isArray(k)?k[0]:k;
var f=isArray(k)?(k.shift(),k):null;
do{var h=getElement(e,g,b,a);
var j=h&&!f;
if(f&&h){for(var c=0;
c<f.length;
++c){j=j||f[c].test(h);
if(j){break
}}}if(j){d.push(h)
}if(!g.global){break
}}while(isset(h));
return d
}function __shouldProcess(a,b){if(!AnyBalance.shouldProcess){return !!b.__id
}return AnyBalance.shouldProcess(a,b)
}function __setLoginSuccessful(){if(AnyBalance.setLoginSuccessful){AnyBalance.setLoginSuccessful()
}}function n2(a){return a<10?"0"+a:""+a
}function fmtDate(b,a){if(!isset(a)){a="."
}return n2(b.getDate())+a+n2(b.getMonth()+1)+a+b.getFullYear()
}function joinUrl(a,b){if(!b){return a
}if(/^\//.test(b)){return a.replace(/^(\w+:\/\/[\w.\-]+).*$/,"$1"+b)
}if(/^\w+:\/\//.test(b)){return b
}a=a.replace(/\?.*$/,"");
if(/:\/\/.*\//.test(a)){a=a.replace(/\/[^\/]*$/,"/")
}if(!endsWith(a,"/")){a+="/"
}return a+b
}function processTable(l,o,n,f,g,d){var e=getElements(l,/<tr[^>]*>/ig);
var j,m;
for(var c=0;
c<e.length;
c++){var h=e[c];
var b=getElements(h,/<td[^>]*>/ig);
if(b.length==0){var a=getElements(h,/<th[^>]*>/ig);
m=a.length;
j=initCols(f,a)
}else{if(b.length==m){var k={};
fillColsResult(f,j,b,k,n);
if(d){d(k,n)
}o.push(k)
}else{if(g){g(h,b)
}}}}}function initCols(d,a){var f={};
for(var c=0;
c<a.length;
c++){var e=a[c];
for(var b in d){if(d[b].re.test(e)){f[b]=c
}}}return f
}function fillColsResult(l,m,h,p,o){function f(r,q){return isset(r)?r:q
}o=o||"";
var j=replaceTagsAndSpaces,n=parseBalance,c=aggregate_sum;
for(var a in l){var b=l[a];
if(isset(m[a])){var d=h[m[a]];
var k=f(b.result_name,a);
if(isArray(k)){var e=[];
for(var g=0;
g<k.length;
g++){e.push(o+k[g])
}k=e
}else{k=o+k
}if(b.result_process){b.result_process(o,d,p)
}else{if(b.result_sum){b.result_re&&(b.result_re.lastIndex=0);
sumParam(d,p,k,b.result_re,f(b.result_replace,j),f(b.result_func,n),f(b.result_aggregate,c))
}else{getParam(d,p,k,b.result_re,f(b.result_replace,j),f(b.result_func,n))
}}}}}String.prototype.regExpExtra=function(){return this.replace(/[\x00-\x20]*/g,"").replace(/\./g,"[\\s\\S]")
};