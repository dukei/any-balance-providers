function NAdapter(l,h,n){var m={};
var f=AnyBalance.isAvailable;
if(!n){n={}
}for(var i in l){if(AnyBalance.isAvailable(i)){var k=l[i];
do{m[k]=true;
k=k.indexOf(".")>=0?k.replace(/\.[^.]*$/,""):null
}while(k!==null)
}}var j={};
AnyBalance.shouldProcess=function(o,p){if(j[o]){return p.__id==j[o]
}var c=h(o,p);
if(c){j[o]=p.__id
}return c
};
function a(o){if(!isArray(o)){o=[o]
}for(var c=0;
c<o.length;
++c){if(m[o[c]]){return true
}if(n.autoSimpleCounters&&e(o[c])){return f.call(AnyBalance,o[c])
}}return false
}function e(c){return c.indexOf(".")<0
}function d(c){for(var o=0;
o<arguments.length;
++o){if(a(arguments[o])){return true
}}return false
}function g(o,r){var q=r.split(/\./g);
var s;
for(var c=0;
c<q.length;
++c){s=o[q[c]];
if(isArray(s)){var p=q.slice(0,c).join(".");
if(j[p]){s=s.reduce(function(t,u){if(!t){if(u.__id==j[p]){return u
}}return t
},null)
}else{s=s[0]
}}if(!isset(s)||s===null){return s
}o=s
}return s
}function b(o,c){AnyBalance.isAvailable=d;
try{return o.apply(null,c)
}finally{AnyBalance.isAvailable=f
}}return{exec:b,convert:function(p){if(!p.success){return p
}var o={success:true};
if(n.autoSimpleCounters){for(var q in p){if(!m[q]&&!isArray(p[q])){o[q]=p[q]
}}}for(var q in l){if(isAvailable([q])){o[q]=g(p,l[q])
}}return o
},envelope:function(c){return function(){return b(c,arguments)
}
}}
};