function NAdapter(f,r,b){var k={};
var a=AnyBalance.isAvailable;
if(!b){b={}
}var g={};
for(var p in f){if(AnyBalance.isAvailable(p)){var i=f[p];
do{k[i]=true;
i=i.indexOf(".")>=0?i.replace(/\.[^.]*$/,""):null
}while(i!==null)
}}var h={};
AnyBalance.shouldProcess=function(t,u){if(h[t]){return u.__id==h[t]
}var c=r(t,u);
if(c){h[t]=u.__id
}return c
};
function l(c){return !!h[c]
}function e(c){for(var t in c){g[t]=c[t]
}}function n(t){if(!isArray(t)){t=[t]
}for(var c=0;
c<t.length;
++c){if(k[t[c]]){return true
}if(b.autoSimpleCounters&&s(t[c])){return a.call(AnyBalance,t[c])
}}return false
}function s(c){return c.indexOf(".")<0
}function d(c){for(var t=0;
t<arguments.length;
++t){if(n(arguments[t])){return true
}}return false
}function q(t,c){if(g[c]){return g[c](t,c)
}if(isArray(t)){t=j(t,c)
}return t
}function j(t,c){if(h[c]&&t[0]&&t[0].__id){return t.reduce(function(u,v){if(!u){if(v.__id==h[c]){return v
}}return u
},null)
}else{return t[0]
}}function m(t,v){var u=v.split(/\./g);
var w;
for(var c=0;
c<u.length;
++c){w=t[u[c]];
v=u.slice(0,c+1).join(".");
w=q(w,v);
if(!isset(w)||w===null){break
}t=w
}return w
}function o(t,c){AnyBalance.isAvailable=d;
try{return t.apply(null,c)
}finally{AnyBalance.isAvailable=a
}}return{exec:o,convert:function(u){if(!u.success){return u
}var t={success:true};
if(b.autoSimpleCounters){for(var v in u){if(!k[v]&&!isArray(u[v])){t[v]=u[v]
}}}for(var v in f){if(isAvailable([v])){t[v]=m(u,f[v])
}}return t
},envelope:function(c){return function(){return o(c,arguments)
}
},wasProcessed:l,setTraverseCallbacks:e}
};