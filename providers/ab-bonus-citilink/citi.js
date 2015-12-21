//Ситилинк, имейте совесть, не надо этих сложных защит. Вы же вашим собственным клиентам (а я, вообще-то, тоже им являюсь) мешаете за балансом поинтов следить.
//Будьте добры, не препятствуйте.

var citi = {},
te = function(obj) {
    var t = obj;
    this.a = t.isAuth,
    this.b = t.directCreditPartnerId,
    this.d = t.staticVersion,
    this.e = t.token
},
kg = function() {
    this.b = -1
},
lg = function() {
    lg.zb(this, "constructor"),
    this.b = 64,
    this.a = Array(4),
    this.g = Array(this.b),
    this.e = this.d = 0,
    this.reset()
},
pg = function(t) {
    var e = new lg
      , i = t.a.e;
    if (qg)
        i = citi.u.atob(i);
    else {
        if (!rg) {
            rg = {},
            sg = {};
            for (var n = 0; 65 > n; n++)
                rg[n] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(n),
                sg[rg[n]] = n
        }
        for (var n = sg, o = [], s = 0; s < i.length; ) {
            var a = n[i.charAt(s++)]
              , r = s < i.length ? n[i.charAt(s)] : 0;
            ++s;
            var l = s < i.length ? n[i.charAt(s)] : 0;
            ++s;
            var c = s < i.length ? n[i.charAt(s)] : 0;
            if (++s,
            null  == a || null  == r || null  == l || null  == c)
                throw Error();
            o.push(a << 2 | r >> 4),
            64 != l && (o.push(r << 4 & 240 | l >> 2),
            64 != c && o.push(l << 6 & 192 | c))
        }
        i = String.fromCharCode.apply(null , o)
    }
    for (ng(e, i + t.a.d),
    i = Array((56 > e.d ? e.b : 2 * e.b) - e.d),
    i[0] = 128,
    t = 1; t < i.length - 8; ++t)
        i[t] = 0;
    for (n = 8 * e.e,
    t = i.length - 8; t < i.length; ++t)
        i[t] = 255 & n,
        n /= 256;
    for (ng(e, i),
    i = Array(16),
    t = n = 0; 4 > t; ++t)
        for (o = 0; 32 > o; o += 8)
            i[n++] = e.a[t] >>> o & 255;
    return jg(i)
},
mg = function(t, e, i) {
    i || (i = 0);
    var o = Array(16);
    if (n(e))
        for (var s = 0; 16 > s; ++s)
            o[s] = e.charCodeAt(i++) | e.charCodeAt(i++) << 8 | e.charCodeAt(i++) << 16 | e.charCodeAt(i++) << 24;
    else
        for (s = 0; 16 > s; ++s)
            o[s] = e[i++] | e[i++] << 8 | e[i++] << 16 | e[i++] << 24;
    e = t.a[0],
    i = t.a[1];
    var s = t.a[2]
      , a = t.a[3]
      , r = 0
      , r = e + (a ^ i & (s ^ a)) + o[0] + 3614090360 & 4294967295;
    e = i + (r << 7 & 4294967295 | r >>> 25),
    r = a + (s ^ e & (i ^ s)) + o[1] + 3905402710 & 4294967295,
    a = e + (r << 12 & 4294967295 | r >>> 20),
    r = s + (i ^ a & (e ^ i)) + o[2] + 606105819 & 4294967295,
    s = a + (r << 17 & 4294967295 | r >>> 15),
    r = i + (e ^ s & (a ^ e)) + o[3] + 3250441966 & 4294967295,
    i = s + (r << 22 & 4294967295 | r >>> 10),
    r = e + (a ^ i & (s ^ a)) + o[4] + 4118548399 & 4294967295,
    e = i + (r << 7 & 4294967295 | r >>> 25),
    r = a + (s ^ e & (i ^ s)) + o[5] + 1200080426 & 4294967295,
    a = e + (r << 12 & 4294967295 | r >>> 20),
    r = s + (i ^ a & (e ^ i)) + o[6] + 2821735955 & 4294967295,
    s = a + (r << 17 & 4294967295 | r >>> 15),
    r = i + (e ^ s & (a ^ e)) + o[7] + 4249261313 & 4294967295,
    i = s + (r << 22 & 4294967295 | r >>> 10),
    r = e + (a ^ i & (s ^ a)) + o[8] + 1770035416 & 4294967295,
    e = i + (r << 7 & 4294967295 | r >>> 25),
    r = a + (s ^ e & (i ^ s)) + o[9] + 2336552879 & 4294967295,
    a = e + (r << 12 & 4294967295 | r >>> 20),
    r = s + (i ^ a & (e ^ i)) + o[10] + 4294925233 & 4294967295,
    s = a + (r << 17 & 4294967295 | r >>> 15),
    r = i + (e ^ s & (a ^ e)) + o[11] + 2304563134 & 4294967295,
    i = s + (r << 22 & 4294967295 | r >>> 10),
    r = e + (a ^ i & (s ^ a)) + o[12] + 1804603682 & 4294967295,
    e = i + (r << 7 & 4294967295 | r >>> 25),
    r = a + (s ^ e & (i ^ s)) + o[13] + 4254626195 & 4294967295,
    a = e + (r << 12 & 4294967295 | r >>> 20),
    r = s + (i ^ a & (e ^ i)) + o[14] + 2792965006 & 4294967295,
    s = a + (r << 17 & 4294967295 | r >>> 15),
    r = i + (e ^ s & (a ^ e)) + o[15] + 1236535329 & 4294967295,
    i = s + (r << 22 & 4294967295 | r >>> 10),
    r = e + (s ^ a & (i ^ s)) + o[1] + 4129170786 & 4294967295,
    e = i + (r << 5 & 4294967295 | r >>> 27),
    r = a + (i ^ s & (e ^ i)) + o[6] + 3225465664 & 4294967295,
    a = e + (r << 9 & 4294967295 | r >>> 23),
    r = s + (e ^ i & (a ^ e)) + o[11] + 643717713 & 4294967295,
    s = a + (r << 14 & 4294967295 | r >>> 18),
    r = i + (a ^ e & (s ^ a)) + o[0] + 3921069994 & 4294967295,
    i = s + (r << 20 & 4294967295 | r >>> 12),
    r = e + (s ^ a & (i ^ s)) + o[5] + 3593408605 & 4294967295,
    e = i + (r << 5 & 4294967295 | r >>> 27),
    r = a + (i ^ s & (e ^ i)) + o[10] + 38016083 & 4294967295,
    a = e + (r << 9 & 4294967295 | r >>> 23),
    r = s + (e ^ i & (a ^ e)) + o[15] + 3634488961 & 4294967295,
    s = a + (r << 14 & 4294967295 | r >>> 18),
    r = i + (a ^ e & (s ^ a)) + o[4] + 3889429448 & 4294967295,
    i = s + (r << 20 & 4294967295 | r >>> 12),
    r = e + (s ^ a & (i ^ s)) + o[9] + 568446438 & 4294967295,
    e = i + (r << 5 & 4294967295 | r >>> 27),
    r = a + (i ^ s & (e ^ i)) + o[14] + 3275163606 & 4294967295,
    a = e + (r << 9 & 4294967295 | r >>> 23),
    r = s + (e ^ i & (a ^ e)) + o[3] + 4107603335 & 4294967295,
    s = a + (r << 14 & 4294967295 | r >>> 18),
    r = i + (a ^ e & (s ^ a)) + o[8] + 1163531501 & 4294967295,
    i = s + (r << 20 & 4294967295 | r >>> 12),
    r = e + (s ^ a & (i ^ s)) + o[13] + 2850285829 & 4294967295,
    e = i + (r << 5 & 4294967295 | r >>> 27),
    r = a + (i ^ s & (e ^ i)) + o[2] + 4243563512 & 4294967295,
    a = e + (r << 9 & 4294967295 | r >>> 23),
    r = s + (e ^ i & (a ^ e)) + o[7] + 1735328473 & 4294967295,
    s = a + (r << 14 & 4294967295 | r >>> 18),
    r = i + (a ^ e & (s ^ a)) + o[12] + 2368359562 & 4294967295,
    i = s + (r << 20 & 4294967295 | r >>> 12),
    r = e + (i ^ s ^ a) + o[5] + 4294588738 & 4294967295,
    e = i + (r << 4 & 4294967295 | r >>> 28),
    r = a + (e ^ i ^ s) + o[8] + 2272392833 & 4294967295,
    a = e + (r << 11 & 4294967295 | r >>> 21),
    r = s + (a ^ e ^ i) + o[11] + 1839030562 & 4294967295,
    s = a + (r << 16 & 4294967295 | r >>> 16),
    r = i + (s ^ a ^ e) + o[14] + 4259657740 & 4294967295,
    i = s + (r << 23 & 4294967295 | r >>> 9),
    r = e + (i ^ s ^ a) + o[1] + 2763975236 & 4294967295,
    e = i + (r << 4 & 4294967295 | r >>> 28),
    r = a + (e ^ i ^ s) + o[4] + 1272893353 & 4294967295,
    a = e + (r << 11 & 4294967295 | r >>> 21),
    r = s + (a ^ e ^ i) + o[7] + 4139469664 & 4294967295,
    s = a + (r << 16 & 4294967295 | r >>> 16),
    r = i + (s ^ a ^ e) + o[10] + 3200236656 & 4294967295,
    i = s + (r << 23 & 4294967295 | r >>> 9),
    r = e + (i ^ s ^ a) + o[13] + 681279174 & 4294967295,
    e = i + (r << 4 & 4294967295 | r >>> 28),
    r = a + (e ^ i ^ s) + o[0] + 3936430074 & 4294967295,
    a = e + (r << 11 & 4294967295 | r >>> 21),
    r = s + (a ^ e ^ i) + o[3] + 3572445317 & 4294967295,
    s = a + (r << 16 & 4294967295 | r >>> 16),
    r = i + (s ^ a ^ e) + o[6] + 76029189 & 4294967295,
    i = s + (r << 23 & 4294967295 | r >>> 9),
    r = e + (i ^ s ^ a) + o[9] + 3654602809 & 4294967295,
    e = i + (r << 4 & 4294967295 | r >>> 28),
    r = a + (e ^ i ^ s) + o[12] + 3873151461 & 4294967295,
    a = e + (r << 11 & 4294967295 | r >>> 21),
    r = s + (a ^ e ^ i) + o[15] + 530742520 & 4294967295,
    s = a + (r << 16 & 4294967295 | r >>> 16),
    r = i + (s ^ a ^ e) + o[2] + 3299628645 & 4294967295,
    i = s + (r << 23 & 4294967295 | r >>> 9),
    r = e + (s ^ (i | ~a)) + o[0] + 4096336452 & 4294967295,
    e = i + (r << 6 & 4294967295 | r >>> 26),
    r = a + (i ^ (e | ~s)) + o[7] + 1126891415 & 4294967295,
    a = e + (r << 10 & 4294967295 | r >>> 22),
    r = s + (e ^ (a | ~i)) + o[14] + 2878612391 & 4294967295,
    s = a + (r << 15 & 4294967295 | r >>> 17),
    r = i + (a ^ (s | ~e)) + o[5] + 4237533241 & 4294967295,
    i = s + (r << 21 & 4294967295 | r >>> 11),
    r = e + (s ^ (i | ~a)) + o[12] + 1700485571 & 4294967295,
    e = i + (r << 6 & 4294967295 | r >>> 26),
    r = a + (i ^ (e | ~s)) + o[3] + 2399980690 & 4294967295,
    a = e + (r << 10 & 4294967295 | r >>> 22),
    r = s + (e ^ (a | ~i)) + o[10] + 4293915773 & 4294967295,
    s = a + (r << 15 & 4294967295 | r >>> 17),
    r = i + (a ^ (s | ~e)) + o[1] + 2240044497 & 4294967295,
    i = s + (r << 21 & 4294967295 | r >>> 11),
    r = e + (s ^ (i | ~a)) + o[8] + 1873313359 & 4294967295,
    e = i + (r << 6 & 4294967295 | r >>> 26),
    r = a + (i ^ (e | ~s)) + o[15] + 4264355552 & 4294967295,
    a = e + (r << 10 & 4294967295 | r >>> 22),
    r = s + (e ^ (a | ~i)) + o[6] + 2734768916 & 4294967295,
    s = a + (r << 15 & 4294967295 | r >>> 17),
    r = i + (a ^ (s | ~e)) + o[13] + 1309151649 & 4294967295,
    i = s + (r << 21 & 4294967295 | r >>> 11),
    r = e + (s ^ (i | ~a)) + o[4] + 4149444226 & 4294967295,
    e = i + (r << 6 & 4294967295 | r >>> 26),
    r = a + (i ^ (e | ~s)) + o[11] + 3174756917 & 4294967295,
    a = e + (r << 10 & 4294967295 | r >>> 22),
    r = s + (e ^ (a | ~i)) + o[2] + 718787259 & 4294967295,
    s = a + (r << 15 & 4294967295 | r >>> 17),
    r = i + (a ^ (s | ~e)) + o[9] + 3951481745 & 4294967295,
    t.a[0] = t.a[0] + e & 4294967295,
    t.a[1] = t.a[1] + (s + (r << 21 & 4294967295 | r >>> 11)) & 4294967295,
    t.a[2] = t.a[2] + s & 4294967295,
    t.a[3] = t.a[3] + a & 4294967295
},
ng = function(t, e) {
    var i;
    void 0 === i && (i = e.length);
    for (var o = i - t.b, s = t.g, a = t.d, r = 0; i > r; ) {
        if (0 == a)
            for (; o >= r; )
                mg(t, e, r),
                r += t.b;
        if (n(e)) {
            for (; i > r; )
                if (s[a++] = e.charCodeAt(r++),
                a == t.b) {
                    mg(t, s),
                    a = 0;
                    break
                }
        } else
            for (; i > r; )
                if (s[a++] = e[r++],
                a == t.b) {
                    mg(t, s),
                    a = 0;
                    break
                }
    }
    t.d = a,
    t.e += i
},
n = function(t) {
    return "string" == typeof t
},
jg = function(t) {
    return Rf(t, function(t) {
        return t = t.toString(16),
        1 < t.length ? t : "0" + t
    }).join("")
},
r = Array.prototype,
Rf = r.map ? function(t, e, i) {
    return r.map.call(t, e, i)
}
 : function(t, e, i) {
    for (var o = t.length, s = Array(o), a = n(t) ? t.split("") : t, r = 0; o > r; r++)
        r in a && (s[r] = e.call(i, a[r], r, t));
    return s
}
;

var rg = null
  , sg = null
  , qg = false;

citi.q = function(t, e) {
    function i() {}
    i.prototype = e.prototype,
    t.q = e.prototype,
    t.prototype = new i,
    t.zb = function(t, i, n) {
        var o = Array.prototype.slice.call(arguments, 2);
        e.prototype[i].apply(t, o)
    }
},
citi.q(lg, kg),
lg.prototype.reset = function() {
    this.a[0] = 1732584193,
    this.a[1] = 4023233417,
    this.a[2] = 2562383102,
    this.a[3] = 271733878,
    this.e = this.d = 0
};

//var input = {"staticVersion":152,"isAuth":false,"directCreditPartnerId":6941837,"token":"YTUyOGUzNjZiMjJmYjMwNWQ0N2E2NzFiNmMzNWI5MzE="}, result = "68931d2922d264d619f6a2483a122480";
//var input = {"staticVersion":152,"isAuth":false,"directCreditPartnerId":6941837,"token":"M2FhODJhYTA2ZmM1ZGI5OTkwMDIyMGFlMjIyNGYwNDE="}, result = "7eff7d0bcb184e7c75c72c04a666ba86";
//var input = {"staticVersion":152,"isAuth":false,"directCreditPartnerId":6941837,"token":"ZGE3N2MwMmU2YjIyOTM0MmYxMzIxMjQ1OTZhMDVhNDE="}, result = "e900a6f646c0bee9fad736fab6968512";
//var obj = new te(input);
//WScript.Echo(result + '\n' + pg({a: obj})); //Весьма сложные преобразования токена
