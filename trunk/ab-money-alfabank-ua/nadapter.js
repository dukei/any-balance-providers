function NAdapter(l,h){var m={};
var f=AnyBalance.isAvailable;
for(var i in l){if(AnyBalance.isAvailable(i)){var k=l[i];
do{m[k]=true;
k=k.indexOf(".")>=0?k.replace(/\.[^.]*$/,""):null
}while(k!==null)
}}var j={};
AnyBalance.shouldProcess=function(n,o){if(j[n]){return o.__id==g_productIds[n]
}var c=h(n,o);
if(c){j[n]=o.__id
}return c
};
function a(n){if(!isArray(n)){n=[n]
}for(var c=0;
c<n.length;
++c){if(m[n[c]]){return true
}if(e(n[c])){return f.call(AnyBalance,n[c])
}}return false
}function e(c){return c.indexOf(".")<0
}function d(c){for(var n=0;
n<arguments.length;
++n){if(a(arguments[n])){return true
}}return false
}function g(n,p){var o=p.split(/\./g);
var q;
for(var c=0;
c<o.length;
++c){q=n[o[c]];
if(isArray(q)){q=q[0]
}if(!isset(q)||q===null){return q
}n=q
}return q
}function b(n,c){AnyBalance.isAvailable=d;
try{return n.apply(null,c)
}finally{AnyBalance.isAvailable=f
}}return{exec:b,convert:function(o){if(!o.success){return o
}var n={success:true};
for(var p in o){if(!m[p]&&!isArray(o[p])){n[p]=o[p]
}}for(var p in l){if(isAvailable([p])){n[p]=g(o,l[p])
}}return n
},envelope:function(c){return function(){return b(c,arguments)
}
}}
};