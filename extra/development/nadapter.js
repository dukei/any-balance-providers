function NAdapter(f,u,b){var o={};
var a=AnyBalance.isAvailable;
if(!b){b={}
}var g={};
for(var s in f){if(isAvailable(s)){var j=f[s];
if(!isArray(j)){j=[j]
}for(var l=0;
l<j.length;
++l){var m=j[l];
do{o[m]=true;
m=m.indexOf(".")>=0?m.replace(/\.[^.]*$/,""):null
}while(m!==null)
}}}var h={};
AnyBalance.shouldProcess=function(w,x){var c=b.shouldProcessMultipleCalls;
c=typeof(c)=="object"?c[w]:c;
if(!c&&h[w]){return x.__id==h[w]
}var i=u(w,x);
if(i){h[w]=x.__id
}return i
};
function p(c){return !!h[c]
}function e(c){for(var i in c){g[i]=c[i]
}}function q(w){if(!isArray(w)){w=[w]
}for(var c=0;
c<w.length;
++c){if(o[w[c]]){return true
}if(b.autoSimpleCounters&&v(w[c])){return a.call(AnyBalance,w[c])
}}return false
}function v(c){return c.indexOf(".")<0
}function d(c){for(var w=0;
w<arguments.length;
++w){if(q(arguments[w])){return true
}}return false
}function t(i,c){if(g[c]){return g[c](i,c)
}if(isArray(i)){i=k(i,c)
}return i
}function k(i,c){if(h[c]&&i[0]&&i[0].__id){return i.reduce(function(w,x){if(!w){if(x.__id==h[c]){return x
}}return w
},null)
}else{return i[0]
}}function n(w,y){var x=y.split(/\./g);
var z;
for(var c=0;
c<x.length;
++c){z=w[x[c]];
y=x.slice(0,c+1).join(".");
z=t(z,y);
if(!isset(z)||z===null){break
}w=z
}return z
}function r(i,c){AnyBalance.isAvailable=d;
try{return i.apply(null,c)
}finally{AnyBalance.isAvailable=a
}}return{exec:r,convert:function(y){if(!y.success){return y
}var w={success:true};
if(b.autoSimpleCounters){for(var B in y){if(!o[B]&&!isArray(y[B])){w[B]=y[B]
}}}for(var B in f){if(isAvailable(B)&&B!="__forceAvailable"){var z=f[B];
if(!isArray(z)){z=[z]
}for(var x=0;
x<z.length;
++x){var A=n(y,z[x]);
if(isset(A)){w[B]=A;
break
}}}}return w
},envelope:function(c){return function(){return r(c,arguments)
}
},traverse:n,wasProcessed:p,setTraverseCallbacks:e}
};