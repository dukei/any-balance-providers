function NAdapter(k,g){var l={};
var e=AnyBalance.isAvailable;
for(var h in k){if(AnyBalance.isAvailable(h)){var j=k[h];
do{l[j]=true;
j=j.indexOf(".")>=0?j.replace(/\.[^.]*$/,""):null
}while(j!==null)
}}var i={};
AnyBalance.shouldProcess=function(m,n){if(i[m]){return n.__id==g_productIds[m]
}var c=g(m,n);
if(c){i[m]=n.__id
}return c
};
function a(m){if(!isArray(m)){m=[m]
}for(var c=0;
c<m.length;
++c){if(l[m[c]]){return true
}if(m[c].indexOf(".")<0){return e.call(AnyBalance,m[c])
}}return false
}function d(c){for(var m=0;
m<arguments.length;
++m){if(a(arguments[m])){return true
}}return false
}function f(m,o){var n=o.split(/\./g);
var p;
for(var c=0;
c<n.length;
++c){p=m[n[c]];
if(isArray(p)){p=p[0]
}if(!isset(p)||p===null){return p
}m=p
}return p
}function b(m,c){AnyBalance.isAvailable=d;
try{return m.apply(null,c)
}finally{AnyBalance.isAvailable=e
}}return{exec:b,convert:function(n){if(!n.success){return n
}var m={success:true};
for(var o in k){if(isAvailable([o])){m[o]=f(n,k[o])
}}return m
},envelope:function(c){return function(){return b(c,arguments)
}
}}
};