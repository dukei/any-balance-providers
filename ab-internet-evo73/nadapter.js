function NAdapter(m,h,o){var n={};
var f=AnyBalance.isAvailable;
if(!o){o={}
}for(var j in m){if(AnyBalance.isAvailable(j)){var l=m[j];
do{n[l]=true;
l=l.indexOf(".")>=0?l.replace(/\.[^.]*$/,""):null
}while(l!==null)
}}var k={};
AnyBalance.shouldProcess=function(p,q){if(k[p]){return q.__id==k[p]
}var c=h(p,q);
if(c){k[p]=q.__id
}return c
};
function i(c){return !!k[c]
}function a(p){if(!isArray(p)){p=[p]
}for(var c=0;
c<p.length;
++c){if(n[p[c]]){return true
}if(o.autoSimpleCounters&&e(p[c])){return f.call(AnyBalance,p[c])
}}return false
}function e(c){return c.indexOf(".")<0
}function d(c){for(var p=0;
p<arguments.length;
++p){if(a(arguments[p])){return true
}}return false
}function g(p,s){var r=s.split(/\./g);
var t;
for(var c=0;
c<r.length;
++c){t=p[r[c]];
if(isArray(t)){var q=r.slice(0,c).join(".");
if(k[q]&&t[0]&&t[0].__id){t=t.reduce(function(u,v){if(!u){if(v.__id==k[q]){return v
}}return u
},null)
}else{t=t[0]
}}if(!isset(t)||t===null){t
}p=t
}return t
}function b(p,c){AnyBalance.isAvailable=d;
try{return p.apply(null,c)
}finally{AnyBalance.isAvailable=f
}}return{exec:b,convert:function(q){if(!q.success){return q
}var p={success:true};
if(o.autoSimpleCounters){for(var r in q){if(!n[r]&&!isArray(q[r])){p[r]=q[r]
}}}for(var r in m){if(isAvailable([r])){p[r]=g(q,m[r])
}}return p
},envelope:function(c){return function(){return b(c,arguments)
}
},wasProcessed:i}
};