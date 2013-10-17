/*!
 * Basis javasript library 
 * http://code.google.com/p/basis-js/
 *
 * @author
 * Roman Dvornov <rdvornov@gmail.com>
 *
 * @copyright
 * Copyright (c) 2006-2011, Roman Dvornov
 *
 * @license
 * GNU General Public License v2.0 <http://www.gnu.org/licenses/gpl-2.0.html>
 */
(function() {
    function n(a, p) {
        for (var b in p)
            a[b] = p[b];
        return a
    }
    function h(a, p) {
        for (var b in p)
            b in a == !1 && (a[b] = p[b]);
        return a
    }
    function i(a) {
        var p = [], b;
        for (b in a)
            p.push(b);
        return p
    }
    function k(a) {
        return a == null || a == void 0
    }
    function r(a) {
        return a
    }
    function s() {
        return !0
    }
    function v() {
        return null
    }
    function w() {
    }
    function t(a) {
        var p = {};
        a.names = function(a) {
            return Object.slice(p, typeof a == "string" ? a.qw() : a)
        };
        a.extend = function(a) {
            h(p, a);
            n(this, a);
            return this
        };
        return a
    }
    function A(a, p) {
        for (var b = a.split("."), o = 
        window, c, e, x; b.length; )
            if (c = b.shift(), e = (e ? e + "." : "") + c, o[c] || (o[c] = t((!b.length ? p : null) || function() {
            }, e), x && (x.namespaces_[e] = o[c])), o = o[c], !x && (x = o, !x.namespaces_))
                x.namespaces_ = {};
        return o
    }
    n(Object, {extend: n,complete: h,keys: i,values: function(a) {
            var p = [], b;
            for (b in a)
                p.push(a[b]);
            return p
        },slice: function(a, p) {
            var b = {};
            if (!p)
                return n(b, a);
            for (var o = 0, c; c = p[o++]; )
                c in a && (b[c] = a[c]);
            return b
        },splice: function(a, p) {
            var b = {};
            if (!p)
                return n(b, a);
            for (var o = 0, c; c = p[o++]; )
                c in a && (b[c] = a[c], delete a[c]);
            return b
        },iterate: function(a, p, b) {
            var o = [], c;
            for (c in a)
                o.push(p.call(b, c, a[c]));
            return o
        },coalesce: function() {
            for (var a = arguments, p = 0; p < a.length; p++)
                if (a[p] != null)
                    return a[p]
        }});
    var u = function() {
        var a = 1, p = {}, b = {};
        a++;
        return function(o, c) {
            var e, x;
            if (!c) {
                if (o.getter)
                    return o.getter;
                if (typeof o == "function")
                    return o
            }
            if (typeof o != "function")
                b[o] ? e = b[o] : (e = new Function("object", "return object != null ? object." + o + " : object"), e.path = o, e.getterIdx_ = a++, b[o] = e);
            else if (e = o, !e.getterIdx_)
                e.getterIdx_ = a++;
            x = e.getterIdx_;
            var g = p[x];
            if (g)
                if (typeof c == "undefined") {
                    if (g.nmg)
                        return g.nmg
                } else
                    for (x = 0; x < g.length; x++) {
                        if (g[x].modificator === c)
                            return g[x].getter
                    }
            else
                g = p[x] = [];
            var j = !0;
            switch (typeof c) {
                case "string":
                    x = function(a) {
                        return c.format(e(a))
                    };
                    break;
                case "function":
                    x = function(a) {
                        return c(e(a))
                    };
                    break;
                case "object":
                    j = !1;
                    x = function(a) {
                        return c[e(a)]
                    };
                    break;
                default:
                    x = e.path ? e : function(a) {
                        return e(a)
                    }
            }
            if (j && (g.push({getter: x,modificator: c}), typeof c == "undefined"))
                g.nmg = x;
            return x.getter = x
        }
    }();
    n(Function, 
    {$undefined: function(a) {
            return a == void 0
        },$defined: function(a) {
            return a != void 0
        },$isNull: k,$isNotNull: function(a) {
            return a != null && a != void 0
        },$isSame: function(a) {
            return a === this
        },$isNotSame: function(a) {
            return a !== this
        },$self: r,$false: function() {
            return !1
        },$true: s,$null: v,$undef: w,getter: u,def: function(a, p, b) {
            b = b || k;
            return function(o) {
                o = a(o);
                return b(o) ? p : o
            }
        },wrapper: function(a) {
            return function(p) {
                var b = {};
                b[a] = p;
                return b
            }
        },lazyInit: function(a, p) {
            var b = 0, o;
            return function() {
                b++ || (o = a.apply(p || this));
                return o
            }
        },lazyInitAndRun: function(a, p, b) {
            var o = 0, c;
            return function() {
                o++ || (c = a.apply(b || this));
                p.apply(c, arguments);
                return c
            }
        },runOnce: function(a, p) {
            var b = 0;
            return function() {
                if (!b++)
                    return a.apply(p || this, arguments)
            }
        }});
    h(Function.prototype, {bind: function(a) {
            var p = this, b = Array.from(arguments, 1);
            return b.length ? function() {
                return p.apply(a, b.concat.apply(b, arguments))
            } : function() {
                return p.apply(a, arguments)
            }
        }});
    n(Boolean, {invert: function(a) {
            return !a
        },normalize: function(a) {
            return !!a
        }});
    h(Array, {isArray: function(a) {
            return Object.prototype.toString.call(a) === 
            "[object Array]"
        }});
    n(Array, {from: function(a, b) {
            var D;
            if (a != null) {
                var o = a.length;
                if (typeof o == "undefined")
                    return [a];
                b || (b = 0);
                if (o - b > 0) {
                    D = [];
                    for (var c = b, e = 0; c < o; c++)
                        D[e++] = a[c];
                    return D
                }
            }
            return []
        },create: function(a, b, D) {
            for (var o = [], c = typeof b == "function", e = 0; e < a; e++)
                o[e] = c ? b.call(D, e, o) : b;
            return o
        }});
    h(Array.prototype, {indexOf: function(a, b) {
            b = parseInt(b) || 0;
            if (b < 0)
                return -1;
            for (; b < this.length; b++)
                if (this[b] === a)
                    return b;
            return -1
        },lastIndexOf: function(a, b) {
            for (var c = this.length, b = parseInt(b), b = isNaN(b) || 
            b >= c ? c - 1 : (b + c) % c; b >= 0; b--)
                if (this[b] === a)
                    return b;
            return -1
        },forEach: function(a, b) {
            for (var c = 0, o = this.length; c < o; c++)
                c in this && a.call(b, this[c], c, this)
        },every: function(a, b) {
            for (var c = 0, o = this.length; c < o; c++)
                if (c in this && !a.call(b, this[c], c, this))
                    return !1;
            return !0
        },some: function(a, b) {
            for (var c = 0, o = this.length; c < o; c++)
                if (c in this && a.call(b, this[c], c, this))
                    return !0;
            return !1
        },filter: function(a, b) {
            for (var c = [], o = 0, g = this.length; o < g; o++)
                o in this && a.call(b, this[o], o, this) && c.push(this[o]);
            return c
        },map: function(a, 
        b) {
            for (var c = [], o = 0, g = this.length; o < g; o++)
                o in this && (c[o] = a.call(b, this[o], o, this));
            return c
        },reduce: function(a, b) {
            var c = this.length, o = arguments.length;
            if (c == 0 && o == 1)
                throw new TypeError;
            var g, e = 0;
            o > 1 && (g = b, e = 1);
            for (o = 0; o < c; o++)
                o in this && (g = e++ ? a.call(null, g, this[o], o, this) : this[o]);
            return g
        }});
    n(Array.prototype, {clone: function() {
            return Array.from(this)
        },flatten: function() {
            return this.concat.apply([], this)
        },unique: function(a) {
            if (!this.length)
                return [];
            var b, c;
            a ? c = [(b = this)[0]] : b = c = Array.from(this).sort(function(a, 
            e) {
                return a === e ? 0 : typeof a == typeof e ? a > e || -1 : typeof a > typeof e || -1
            });
            for (var a = 1, o = 0; a < b.length; a++)
                c[o] !== b[a] && (c[++o] = b[a]);
            c.length = o + 1;
            return c
        },collapse: function(a, b) {
            for (var c = this.length, o = 0, g = 0; o < c; o++)
                a.call(b, this[o], o, this) || (this[g++] = this[o]);
            this.length = g;
            return this
        },exclude: function(a) {
            return this.filter(this.absent, a)
        },repeat: function(a) {
            return Array.create(parseInt(a) || 0, this).flatten()
        },item: function(a) {
            a = parseInt(a || 0);
            return this[a >= 0 ? a : this.length + a]
        },first: function() {
            return this[0]
        },
        last: function() {
            return this[this.length - 1]
        },search: function(a, b, c) {
            Array.lastSearchIndex = -1;
            for (var b = Function.getter(b || r), c = parseInt(c || 0), o = this.length; c < o; c++)
                if (b(this[c]) === a)
                    return this[Array.lastSearchIndex = c]
        },lastSearch: function(a, b, c) {
            Array.lastSearchIndex = -1;
            for (var b = Function.getter(b || r), o = this.length - 1, c = isNaN(c) || c == null ? o : parseInt(c), o = c > o ? o : c; o >= 0; o--)
                if (b(this[o]) === a)
                    return this[Array.lastSearchIndex = o]
        },binarySearchPos: function(a, b, c, o, g, e) {
            if (!this.length)
                return o ? -1 : 0;
            var b = 
            Function.getter(b || r), c = !!c, x, g = isNaN(g) ? 0 : g, j = isNaN(e) ? this.length - 1 : e;
            do
                if (e = g + j >> 1, x = b(this[e]), c ? a > x : a < x)
                    j = e - 1;
                else if (c ? a < x : a > x)
                    g = e + 1;
                else
                    return a == x ? e : -1;
            while (g <= j);
            return o ? -1 : e + (x < a ^ c)
        },binarySearch: function(a, b) {
            return this.binarySearchPos(a, b, !1, !0)
        },binarySearchIntervalPos: function(a, b, c, o, g, e) {
            if (!this.length)
                return -1;
            var b = u(b || r), c = u(c || r), x = isNaN(g) ? 0 : g, j = isNaN(e) ? this.length - 1 : e, l;
            do
                if (g = this[e = x + j >> 1], a < (l = b(g)))
                    j = e - 1;
                else if (a > (x = c(g)))
                    x = e + 1;
                else
                    return a >= l && a <= x ? e : -1;
            while (x <= 
            j);
            return o ? -1 : e + (c(g) < a)
        },binarySearchInterval: function(a, b, c) {
            return this.binarySearchIntervalPos(a, b, c, !0)
        },equal: function(a) {
            return this.length == a.length && this.every(function(b, c) {
                return b === a[c]
            })
        },add: function(a) {
            return this.indexOf(a) == -1 && !!this.push(a)
        },remove: function(a) {
            a = this.indexOf(a);
            return a != -1 && !!this.splice(a, 1)
        },has: function(a) {
            return this.indexOf(a) != -1
        },absent: function(a) {
            return this.indexOf(a) == -1
        },merge: function(a) {
            return this.reduce(n, a || {})
        },sortAsObject: function(a, b, c) {
            a = 
            Function.getter(a);
            c = c ? -1 : 1;
            return this.map(function(b, c) {
                return {i: c,v: a(b)}
            }).sort(b || function(a, b) {
                return c * (a.v > b.v || -(a.v < b.v) || (a.i > b.i ? 1 : -1))
            }).map(function(a) {
                return this[a.i]
            }, this)
        },set: function(a) {
            this !== a && this.clear().push.apply(this, a);
            return this
        },clear: function() {
            this.length = 0;
            return this
        }});
    if (![1, 2].splice(1).length) {
        var f = Array.prototype.splice;
        Array.prototype.splice = function() {
            var a = Array.from(arguments);
            if (a.length < 2)
                a[1] = this.length;
            return f.apply(this, a)
        }
    }
    var d = {"<": ">","[": "]",
        "(": ")","{": "}","\u00ab": "\u00bb"};
    String.Entity = {laquo: "\u00ab",raquo: "\u00bb",nbsp: "\u00a0",quot: '"',quote: '"',copy: "\u00a9",shy: "\u00ad",para: "\u00b6",sect: "\u00a7",deg: "\u00b0",mdash: "\u2014",hellip: "\u2026"};
    h(String, {toLowerCase: function(a) {
            return String(a).toLowerCase()
        },toUpperCase: function(a) {
            return String(a).toUpperCase()
        },trim: function(a) {
            return String(a).trim()
        },trimLeft: function(a) {
            return String(a).trimLeft()
        },trimRight: function(a) {
            return String(a).trimRight()
        },isEmpty: function(a) {
            return a == 
            null || String(a) == ""
        },isNotEmpty: function(a) {
            return a != null && String(a) != ""
        }});
    h(String.prototype, {trimLeft: function() {
            return this.replace(/^\s+/, "")
        },trimRight: function() {
            return this.replace(/\s+$/, "")
        },trim: function() {
            return this.trimLeft().trimRight()
        }});
    n(String.prototype, {toObject: function() {
            try {
                return Function("return 0," + this)()
            } catch (a) {
            }
        },toArray: (new String("a"))[0] ? function() {
            return Array.from(this)
        } : function() {
            for (var a = [], b = this.length, c = 0; c < b; c++)
                a[c] = this.charAt(c);
            return a
        },repeat: function(a) {
            return Array(parseInt(a) + 
            1 || 0).join(this)
        },qw: function() {
            var a = this.trim();
            return a ? a.split(/\s+/) : []
        },forRegExp: function() {
            return this.replace(/[\/\\\(\)\[\]\?\{\}\|\*\+\-\.\^\$]/g, "\\$&")
        },format: function(a) {
            for (var b = {}, c = 0; c < arguments.length; c++)
                b[c] = arguments[c];
            typeof a == "object" && n(b, a);
            return this.replace(/\{([a-z\d\_]+)(?::([\.0])(\d+)|:(\?))?\}/gi, function(a, c, e, g, D) {
                a = c in b ? b[c] : D ? "" : a;
                return e && !isNaN(a) ? (a = Number(a), e == "." ? a.toFixed(g) : a.lead(g)) : a
            })
        },ellipsis: function(a) {
            a = this.substr(0, a || 0);
            return this.length > 
            a.length ? a + "\u2026" : a
        },quote: function(a, b) {
            var a = a || '"', b = b || d[a] || a, c = (a.length == 1 ? a : "") + (b.length == 1 ? b : "");
            return a + (c ? this.replace(RegExp("[" + c.forRegExp() + "]", "g"), "\\$&") : this) + b
        },capitalize: function() {
            return this.charAt(0).toUpperCase() + this.substr(1).toLowerCase()
        },camelize: function() {
            return this.replace(/-(.)/g, function(a, b) {
                return b.toUpperCase()
            })
        },dasherize: function() {
            return this.replace(/[A-Z]/g, function(a) {
                return "-" + a.toLowerCase()
            })
        }});
    String.format = String.prototype.format;
    if ("|||".split(/\|/).length + 
    "|||".split(/(\|)/).length != 11)
        String.prototype.split = function(a) {
            if (a == "" || a && a.source == "")
                return this.toArray();
            var b = [], c = 0, o;
            if (a instanceof RegExp)
                for (a.global || (a = RegExp(a.source, /\/([mi]*)$/.exec(a)[1] + "g")); o = a.exec(this); )
                    o[0] = this.substring(c, o.index), b.push.apply(b, o), c = a.lastIndex;
            else
                for (; (o = this.indexOf(a, c)) != -1; )
                    b.push(this.substring(c, o)), c = o + a.length;
            b.push(this.substr(c));
            return b
        };
    if ("12".substr(-1) != "2") {
        var B = String.prototype.substr;
        String.prototype.substr = function(a, b) {
            return B.call(this, 
            a < 0 ? Math.max(0, this.length + a) : a, b)
        }
    }
    n(Number.prototype, {fit: function(a, b) {
            return !isNaN(a) && this < a ? Number(a) : !isNaN(b) && this > b ? Number(b) : this
        },between: function(a, b) {
            return !isNaN(this) && this >= a && this <= b
        },quote: function(a, b) {
            return (this + "").quote(a, b)
        },toHex: function() {
            return parseInt(this).toString(16).toUpperCase()
        },sign: function() {
            return this < 0 ? -1 : +(this > 0)
        },base: function(a) {
            return !a || isNaN(a) ? 0 : Math.floor(this / a) * a
        },lead: function(a, b) {
            return (this + "").replace(/\d+/, function(c) {
                return (a -= c.length - 
                1) > 1 ? Array(a).join(b || 0) + c : c
            })
        },group: function(a, b) {
            return (this + "").replace(/\d+/, function(c) {
                return c.replace(/\d/g, function(o, g) {
                    return !g + (c.length - g) % (a || 3) ? o : (b || " ") + o
                })
            })
        },format: function(a, b, c, o, g) {
            a = this.toFixed(a);
            if (b || g)
                a = a.replace(/(\d+)(\.?)/, function(a, c, o) {
                    return (b ? Number(c).group(3, b) : c) + (o ? g || o : "")
                });
            c && (a = a.replace(/^-?/, "$&" + (c || "")));
            return a + (o || "")
        }});
    h(Date, {now: function() {
            return +new Date
        }});
    (new Date).getYear() < 1900 && n(Date.prototype, {getYear: function() {
            return this.getFullYear() - 
            1900
        },setYear: function(a) {
            return this.setFullYear(!isNaN(a) && a < 100 ? Number(a) + 1900 : a)
        }});
    var C = function() {
        function a(a) {
            for (var e = 1E6, a = String(a).split("."), b = 0, c = 0; b < 4 && b < a.length; b++, e /= 100)
                c += a[b] * e;
            return c
        }
        function b() {
            for (var c = 0; c < arguments.length; c++) {
                var q = arguments[c].toLowerCase();
                if (q in e) {
                    if (e[q])
                        return !0
                } else {
                    var p = q.match(/^([a-z]+)(([\d\.]+)([+-=]?))?$/i);
                    if (p) {
                        e[q] = !1;
                        var o = p[1].toLowerCase(), g = a(p[3]), p = p[4] || "=";
                        if (o = x[o])
                            return e[q] = !g || p == "=" && o == g || p == "+" && o >= g || p == "-" && o < g
                    }
                }
            }
            return !1
        }
        var c = "Basis.Browser", o = {datauri: !1}, g = typeof Image != "undefined" ? new Image : {};
        g.onload = function() {
            o.datauri = !0
        };
        g.src = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
        var e = {}, x = {}, j = window.navigator.userAgent, l = "unknown", m = "unknown", d = {MSIE: ["Internet Explorer", "msie", "ie"],Gecko: ["Gecko", "gecko"],Safari: ["Safari", "safari"],"iPhone OS": ["iPhone", "iphone"],AdobeAir: ["AdobeAir", "air"],AppleWebKit: ["WebKit"],Chrome: ["Chrome", "chrome"],FireFox: ["FireFox", "firefox", 
                "ff"],Iceweasel: ["FireFox", "firefox", "ff"],Shiretoko: ["FireFox", "firefox", "ff"],Opera: ["Opera", "opera"]}, f;
        for (f in d)
            if (!(f == "MSIE" && window.opera) && !(f == "Safari" && j.match(/chrome/i)) && !(f == "AppleWebKit" && j.match(/iphone/i)) && j.match(RegExp(f + ".(\\d+(\\.\\d+)*)", "i")))
                for (var q = d[f], G = window.opera && typeof window.opera.version == "function" ? window.opera.version() : RegExp.$1, E = a(G), l = q[0] + E, m = q[0] + " " + G, G = 0; G < q.length; G++)
                    x[q[G].toLowerCase()] = E;
        c = A(c);
        c.toString = function() {
            return m
        };
        return c.extend({FeatureSupport: o,
            testImage: g,name: l,prettyName: m,test: b,is: function(a) {
                return b(a)
            },Cookies: {set: function(a, e, b, c) {
                    document.cookie = a + "=" + (e == null ? "" : escape(e)) + ";path=" + (c || (location.pathname.indexOf("/") == 0 ? "" : "/") + location.pathname) + (b ? ";expires=" + (new Date(Date.now() + b * 1E3)).toGMTString() : "")
                },get: function(a) {
                    return (a = document.cookie.match(RegExp("(^|;)\\s*" + a + "\\s*=\\s*(.*?)\\s*(;|$)"))) && unescape(a[2])
                },remove: function(a, e) {
                    document.cookie = a + "=;expires=" + (new Date(0)).toGMTString() + ";path=" + (e || (location.pathname.indexOf("/") == 
                    0 ? "" : "/") + location.pathname)
                }}})
    }(), y = function() {
        function a(a, b, e) {
            b || (b = c);
            var g = function() {
                var a = this.inherit;
                this.inherit = b;
                var e = g.method.apply(this, arguments);
                this.inherit = a;
                return e
            };
            g.toString = function() {
                return g.method.toString()
            };
            g.valueOf = function() {
                return g.method.valueOf()
            };
            return n(g, {method: a,proto: e})
        }
        var c = n(function() {
        }, {inherit: w,proto: null,toString: function() {
                return "[abstract method]"
            }}), g = function() {
        };
        n(g, {className: "Basis.Class",prototype: {constructor: null,init: Function(),toString: function() {
                    return "[object " + 
                    (this.constructor || this).className + "]"
                }},create: function(a) {
                typeof a != "function" && (a = g);
                for (var b, e = arguments, c = 1; c < e.length; c++)
                    if (e[c].className)
                        b = e[c].className;
                b || (b = a.className + "._SubClass_");
                var p = (new Function("return {'" + b + "': function(){\n  this.init.apply(this, arguments);\n}}['" + b + "'];"))(), c = Function();
                c.prototype = a.prototype;
                p.prototype = new c;
                p.superClass_ = a;
                p.className = b;
                p.extend = g.extend;
                for (c = 1; c < e.length; c++)
                    p.extend(e[c]);
                return p.prototype.constructor = p
            },extend: function(c) {
                var p = 
                this.prototype;
                if (c.prototype)
                    c = c.prototype;
                var e = Object.keys(c);
                c.toString !== Object.prototype.toString && e.add("toString");
                for (var x = e.length; x--; ) {
                    var j = e[x], l = c[j];
                    if (j == "className")
                        this.className = l;
                    else {
                        var m;
                        if (m = j == "behaviour") {
                            for (m = this.superClass_; m && m !== this && m !== b; )
                                m = m.superClass_;
                            m = m === b
                        }
                        m ? p[j] = l && l.isBehaviour_ ? l : b.createBehaviour(this.superClass_, l) : (typeof l == "function" && l.extend !== g.extend && (l = a(l.method || l, p[j], p)), p[j] = l)
                    }
                }
                return this
            },destroy: function() {
                for (var a in this)
                    delete this[a];
                this.destroy = w
            }});
        return A("Basis.Class", g.create).extend({BaseClass: g,create: g.create})
    }(), b = function() {
        function a(a, e) {
            var b = a && a.prototype;
            return new (y(b && b.behaviour && b.behaviour.constructor, Object.extend({isBehaviour_: !0,className: a ? "subclass of " + a.className + ".Behaviour" : "EventObject.Behaviour"}, e)))
        }
        var b = Array.prototype.slice, c = 1, g = y(null, {className: "Basis.EventObject",eventObjectId: 0,behaviour: a(null, {}),handlers_: [],init: function(a) {
                this.handlers_ = [];
                this.eventObjectId = c++;
                a && a.handlers && 
                this.handlers_.push({handler: a.handlers,thisObject: a.handlersContext || this});
                return a
            },addHandler: function(a, e) {
                for (var e = e || this, b = 0, c; c = this.handlers_[b]; b++)
                    if (c.handler === a && c.thisObject === e)
                        return !1;
                this.handlers_.push({handler: a,thisObject: e});
                return !0
            },removeHandler: function(a, e) {
                for (var e = e || this, b = 0, c; c = this.handlers_[b]; b++)
                    if (c.handler === a && c.thisObject === e)
                        return this.handlers_.splice(b, 1), !0;
                return !1
            },dispatch: function(a) {
                var e = this.behaviour[a], c = this.handlers_.length;
                if (c || e) {
                    var g = 
                    b.call(arguments, 1);
                    if (c)
                        for (var c = b.call(this.handlers_), o, j, l = c.length; l--; )
                            o = c[l], j = o.handler[a], typeof j == "function" && j.apply(o.thisObject, g);
                    typeof e == "function" && e.apply(this, g)
                }
            },destroy: function() {
                this.destroy = Function.$undef;
                this.dispatch("destroy", this);
                delete this.handlers_;
                this.dispatch = Function.$undef
            }});
        g.createBehaviour = a;
        return g
    }(), l = function() {
        function a(a, e, b) {
            if (e != null)
                return a.insertBefore(v(e) ? e : f(e), b || null)
        }
        function b(a) {
            return I("", a.cloneNode(!0)).innerHTML
        }
        function g(a) {
            if (a)
                return a = 
                String(a).trim().split(/\s*,\s*|\s+/).unique(), a.indexOf("*") == -1 && a
        }
        function o(a) {
            return v(a) || a && a.nodeType ? a : typeof a == "string" ? E.getElementById(a) : null
        }
        function m(a, e) {
            a = o(a) || E;
            return e == "*" && a.all ? Array.from(a.all) : Array.from(a.getElementsByTagName(e || "*"))
        }
        function e(a, e, b) {
            var c, q, p = [], b = typeof b == "string" ? u(b) : b || s;
            switch (e) {
                case 1:
                case 2:
                    for (q = a; (q = q[h]) && q !== a.document; )
                        b(q) && p.push(q);
                    break;
                case 64:
                    for (q = a[M]; q; )
                        b(q) && p.push(q), q = q[B];
                    break;
                case 4:
                case 8:
                    a[M] && (new w(a)).nodes(b, p);
                    break;
                case 128:
                    c = new w(E, b);
                    for (c.cursor = a[B] || a[h]; q = c.next(); )
                        p.push(q);
                    break;
                case 256:
                    for (q = a; q = q[B]; )
                        b(q) && p.push(q);
                    break;
                case 32:
                    b(a[h]) && p.push(a[h]);
                    break;
                case 512:
                    c = new w(E, b, w.BACKWARD);
                    for (c.cursor = a[k] || a[h]; q = c.next(); )
                        p.push(q);
                    break;
                case 1024:
                    for (q = a; q = q[k]; )
                        b(q) && p.push(q)
            }
            e & 26 && b(a) && p.unshift(a);
            return p
        }
        function x(a, e, b, c) {
            if (!e || e == "*")
                e = s;
            typeof e == "string" && (e = u("tagName==" + e.quote()));
            b = b || 0;
            do {
                a = a[this];
                if (!a || a === c)
                    break;
                if (e(a))
                    return a
            } while (--b);
            return null
        }
        function d(a, e, b) {
            for (var c = 
            0; a = x.call(this, a, e, 0, b); )
                c++;
            return c
        }
        function f(a) {
            return E.createTextNode(a != null ? a : "")
        }
        function z() {
            for (var e = E.createDocumentFragment(), b = arguments.length, c = z.array = [], q = 0; q < b; q++)
                c.push(a(e, arguments[q]));
            return e
        }
        function I(e, b) {
            var c = e != void 0 && typeof e != "string", q = (c ? e.description : e) || "", p = "div", g = q.match(/^([a-z0-9\_\-]+)(.*)$/i);
            g && (p = g[1], q = g[2]);
            if (q != "") {
                for (var o = [], x = {}, D; g = T.exec(q); ) {
                    if (g[8])
                        throw Error("Create element error in DOM.createElement()\n\nDescription:\n> " + q + "\n\nProblem place:\n> " + 
                        q.substr(0, g.index) + "--\>" + q.substr(g.index) + "<--");
                    D = g[2] || g[3];
                    switch (g[1]) {
                        case "#":
                            x.id = D;
                            break;
                        case ".":
                            o.push(D);
                            break;
                        default:
                            D != "class" && (x[D] = g[4] ? g[5] || g[6] || g[7] : D)
                    }
                }
                U && x.name && /^(input|textarea|select)$/i.test(p) && (p = "<" + p + " name=" + x.name + ">")
            }
            q = E.createElement(p);
            if (x) {
                if (x.style && O)
                    q.style.cssText = x.style;
                for (var m in x)
                    q.setAttribute(m, x[m], 0)
            }
            if (o && o.length)
                q.className = o.join(" ");
            arguments.length > 1 && a(q, z.apply(0, Array.from(arguments, 1).flatten()));
            if (c) {
                e.css && l.Style.setStyle(q, 
                e.css);
                for (var F in e)
                    typeof e[F] == "function" ? j.addHandler(q, F, e[F], q) : e[F] instanceof j.Handler && j.addHandler(q, F, e[F].handler, e[F].thisObject)
            }
            return q
        }
        function i(a, e) {
            return a[h] ? a[h].replaceChild(e, a) : a
        }
        function q(a) {
            return !!(a && a.nodeType == 3)
        }
        function G(a) {
            if (E.selection) {
                var e = E.selection.createRange();
                e.compareEndPoints("StartToEnd", e) != 0 && e.collapse(a);
                return e.getBookmark().charCodeAt(2) - 2
            }
        }
        var E = window.document, F = E.createElement("div"), h = "parentNode", M = "firstChild", B = "nextSibling", k = "previousSibling", 
        C = r, t = function() {
            return 0
        };
        typeof F.compareDocumentPosition == "function" ? (C = function(a) {
            return a.sort(function(a, e) {
                return 3 - (t(a, e) & 6)
            })
        }, t = function(a, e) {
            return a.compareDocumentPosition(e)
        }) : (C = function(a) {
            return a.sortAsObject(u("sourceIndex"))
        }, t = function(a, e) {
            return a == e ? 0 : a.document != e.document ? 33 : a.sourceIndex > e.sourceIndex ? 2 | 8 * e.contains(a) : 4 | 16 * a.contains(e)
        });
        var v;
        if (typeof Node != "undefined") {
            if (v = function(a) {
                return a instanceof Node
            }, !Node.prototype.contains)
                Node.prototype.contains = function(a) {
                    return !!(t(this, 
                    a) & 16)
                }
        } else
            v = function(a) {
                return a && a.ownerDocument === E
            };
        var w = y(null, {className: "Basis.DOM.TreeWalker",root_: E,cursor_: null,filter: s,init: function(a, e, b) {
                this.setRoot(a);
                this.setDirection(b);
                if (typeof e == "function")
                    this.filter = e;
                c.add(this)
            },setDirection: function(a) {
                n(this, a ? {a: "lastChild",b: k,c: B,d: M} : {a: M,b: B,c: k,d: "lastChild"})
            },setRoot: function(a) {
                this.root_ = a || E;
                this.reset()
            },reset: function() {
                this.cursor_ = null
            },first: function(a) {
                this.reset();
                return this.next(a)
            },last: function(a) {
                this.reset();
                return this.prev(a)
            },nodes: function(a, e) {
                var b;
                e || (e = []);
                for (this.reset(); b = this.next(a); )
                    e.push(b);
                return e
            },next: function(a) {
                var a = a || this.filter, e = this.cursor_ || this.root_;
                do
                    for (var b = e[this.a]; !b; ) {
                        if (e === this.root_)
                            return this.cursor_ = null;
                        (b = e[this.b]) || (e = e[h])
                    }
                while (!a(e = b));
                return this.cursor_ = e
            },prev: function(a) {
                var a = a || this.filter, e = this.cursor_, b = this.c, c = this.d;
                do {
                    var q = e ? e[b] : this.root_[c];
                    if (q) {
                        for (; q[c]; )
                            q = q[c];
                        e = q
                    } else
                        e && (e = e[h]);
                    if (!e || e === this.root_) {
                        e = null;
                        break
                    }
                } while (!a(e));
                return this.cursor_ = e
            },destroy: function() {
                c.remove(this)
            }});
        w.BACKWARD = !0;
        var V = "textContent innerText nodeValue".qw(), P = x.bind(k), Q = x.bind(B), W = x.bind(h), X = d.bind(k), Y = d.bind(B), Z = d.bind(h), U = function() {
            var a = E.createElement("input");
            a.name = "a";
            return !/name/.test(b(a))
        }(), O;
        F.setAttribute("style", "color: red");
        O = F.style.color !== "red";
        var T = /([\#\.])([a-z0-9\_\-\:]+)|\[([a-z0-9\_\-]+)(=(?:\"((?:\\.|[^\"])+)\"|\'((?:\\.|[^\'])+)\'|((?:\\.|[^\]])+)))?\s*\]|\s*(\S)/gi, R = {};
        "insert parentOf isInside".qw().forEach(function(a) {
            R[a] = 
            function() {
                var e = Array.from(arguments);
                e.unshift(S);
                return l[a].apply(l, e)
            }
        });
        var S;
        return A("Basis.DOM", function(a) {
            S = o(a);
            return R
        }).extend({ELEMENT_NODE: 1,ATTRIBUTE_NODE: 2,TEXT_NODE: 3,CDATA_SECTION_NODE: 4,ENTITY_REFERENCE_NODE: 5,ENTITY_NODE: 6,PROCESSING_INSTRUCTION_NODE: 7,COMMENT_NODE: 8,DOCUMENT_TYPE_NODE: 10,DOCUMENT_NODE: 9,DOCUMENT_FRAGMENT_NODE: 11,NOTATION_NODE: 12,AXIS_ANCESTOR: 1,AXIS_ANCESTOR_OR_SELF: 2,AXIS_DESCENDANT: 4,AXIS_DESCENDANT_OR_SELF: 8,AXIS_SELF: 16,AXIS_PARENT: 32,AXIS_CHILD: 64,AXIS_FOLLOWING: 128,
            AXIS_FOLLOWING_SIBLING: 256,AXIS_PRESCENDING: 512,AXIS_PRESCENDING_SIBLING: 1024,INSERT_BEGIN: "begin",INSERT_END: "end",INSERT_BEFORE: "before",INSERT_AFTER: "after",sort: C,comparePosition: t,TreeWalker: w,outerHTML: b,textContent: function(a) {
                for (var b = 0, c; c = V[b++]; )
                    if (a[c] != null)
                        return a[c];
                return e(a, 4, q).map(u("nodeValue")).join("")
            },get: o,tag: m,tags: function(a, e) {
                return C((g(e) || ["*"]).map(function(e) {
                    return m(a, e)
                }).flatten())
            },axis: e,first: function(a, e, b) {
                a = a[M];
                return !a || !e || e(a) ? a : Q(a, e, b)
            },last: function(a, 
            e, b) {
                a = a.lastChild;
                return !a || !e || e(a) ? a : P(a, e, b)
            },next: Q,prev: P,parent: W,index: X,lastIndex: Y,deep: Z,createElement: I,createText: f,createFragment: z,insert: function(e, b, c, q) {
                e = o(e);
                if (!e)
                    throw Error("DOM.insert: destination node can't be null");
                switch (c) {
                    case void 0:
                    case "end":
                        q = null;
                        break;
                    case "begin":
                        q = e[M];
                        break;
                    case "before":
                        break;
                    case "after":
                        q = q[B];
                        break;
                    default:
                        q = Number(c).between(0, e.childNodes.length) ? e.childNodes[c] : null
                }
                c = !v(e);
                if (!b || !Array.isArray(b))
                    c = c ? b && e.insertBefore(b, q) : a(e, b, q);
                else if (c)
                    for (var c = [], p = 0, g = b.length; p < g; p++)
                        c[p] = e.insertBefore(b[p], q);
                else
                    e.insertBefore(z.apply(0, b), q), c = z.array;
                return c
            },remove: function(a) {
                return a[h] ? a[h].removeChild(a) : a
            },replace: i,swap: function(a, e) {
                if (a === e || t(a, e) & 25)
                    return !1;
                i(a, F);
                i(e, a);
                i(F, e);
                return !0
            },clone: function(a, b) {
                var c = a.cloneNode(!b);
                c.attachEvent && e(c, 8).forEach(j.clearHandlers);
                return c
            },clear: function(a) {
                for (a = o(a); a.lastChild; )
                    a.removeChild(a.lastChild);
                return a
            },wrap: function(a, e, b) {
                var c = [], b = Function.getter(b || 
                r), q;
                for (q in e)
                    for (var p = 0; p < a.length; p++) {
                        var g = b(a[p]);
                        c[p] = e[q](a[p], p, g) ? l.createElement(q, g) : a[p]
                    }
                return c
            },setAttribute: function(a, e, b) {
                b == null ? a.removeAttribute(e) : a.setAttribute(e, b)
            },IS_ELEMENT_NODE: function(a) {
                return !!(a && a.nodeType == 1)
            },IS_TEXT_NODE: q,is: function(a, e) {
                return (g(e) || []).has(a.tagName)
            },parentOf: function(a, e) {
                return a.contains(e)
            },isInside: function(a, e) {
                return a == e || e.contains(a)
            },focus: function(a, e) {
                try {
                    a = o(a), a.focus(), e && a.select && a.select()
                } catch (b) {
                }
            },setSelectionRange: function(a, 
            e, b) {
                arguments.length < 3 && (b = e);
                if (a.setSelectionRange)
                    a.setSelectionRange(e, b);
                else if (a.createTextRange) {
                    var c = a.createTextRange();
                    c.collapse(!0);
                    c.moveStart("character", e);
                    c.moveEnd("character", b - e);
                    c.select()
                }
            },getSelectionStart: function(a) {
                return typeof a.selectionStart != "undefined" ? a.selectionStart : G(!0)
            },getSelectionEnd: function(a) {
                return typeof a.selectionEnd != "undefined" ? a.selectionEnd : G(!1)
            }})
    }();
    (function() {
        function a(a, e) {
			try {
				var b = a.match(/^([^{]+)\{(.*)\}\s*$/);
				if (b) {
					for (var c = b[1].trim().split(/\s*,\s*/), 
					q = 0; q < c.length; q++)
						this.addRule(c[q], b[2] || null, e++);
					return e - 1
				}
			}
			catch(e)
			{}
        }
        function b(e, c) {
			try {
				var q = l.createElement(!e ? 'STYLE[type="text/css"]' : 'LINK[type="text/css"][rel="{alt}stylesheet"][href={url}]'.format({alt: c ? "alternate " : "",url: e.quote('"')}));
				l.tag(document, "HEAD")[0].appendChild(q);
				q = q.sheet || q.styleSheet;
                if (!q.cssRules)
                    q.cssRules = q.rules
            } catch (p) {
            }
            if (!q.insertRule)
                q.insertRule = a;
            if (!q.deleteRule)
                q.deleteRule = q.removeRule;
            return q
        }
        function c(a, e) {
            a || (a = "DefaultGenericStyleSheet");
            h[a] || e && (h[a] = 
            new E(b()));
            return h[a]
        }
        function g(a, e, b, c) {
            for (var c = c || {}, e = e.qw(), p = 0, o; o = e[p]; p++)
                if (typeof G.style[o] != "undefined") {
                    b && (C.FeatureSupport["css-" + a] = o);
                    q[a] = {key: o,getter: c[o]};
                    break
                }
        }
        function j(a, e) {
            var b = q[a];
            if (a = b ? b.key : a.replace(/^-ms-/, "ms-").camelize())
                return {key: a,value: b && b.getter ? b.getter(e) : e}
        }
        function e(a, e, b) {
            if (typeof a.setProperty == "function")
                return a.setProperty(e, b);
            if (e = j(e, b))
                return a.style[e.key] = e.value
        }
        function x(a, b) {
            for (var c in b)
                e(a, c, b[c]);
            return a
        }
        function m(a, b) {
            return e(a, 
            "display", typeof b == "string" ? b : b ? "" : "none")
        }
        function d(a, b) {
            return e(a, "visibility", b ? "" : "hidden")
        }
        var f = /\s*!important/i, I = String("important"), h = {}, q = {}, G = l.createElement("DIV");
        g("opacity", "opacity MozOpacity KhtmlOpacity filter", !0, {fitler: function(a) {
                return "alpha(opacity:_)".replace("_", parseInt(a * 100))
            }});
        g("border-radius", "borderRadius MozBorderRadius WebkitBorderRadius", !0);
        g("float", "cssFloat styleFloat");
        var E = y(null, {className: "Basis.DOM.Style.CssStyleSheetWrapper",styleSheet: null,rules: null,
            init: function(a) {
                this.styleSheet = a;
                this.rules = [];
                this.map_ = {}
            },getRule: function(a, e) {
                if (!this.map_[a] && e) {
                    for (var b = this.styleSheet, c = this.rules.length, q = b.insertRule(a + "{}", c), p = c; p <= q; p++)
                        this.rules.push(new F(b.cssRules[p]));
                    this.map_[a] = c != q ? new z(this.rules.splice(c)) : this.rules[c]
                }
                return this.map_[a]
            },deleteRule: function(a) {
                var e = this.map_[a];
                if (e) {
                    for (var e = e.rules || [e], b = 0; b < e.length; b++) {
                        var c = this.rules.indexOf(e[b]);
                        this.stylesheet.deleteRule(c);
                        this.rules.splice(c, 1)
                    }
                    delete this.map_[a]
                }
            },
            destroy: function() {
                delete this.rules
            }}), F = y(null, {className: "Basis.DOM.Style.CssRuleWrapper",rule: null,selector: "",init: function(a) {
                if (a)
                    this.rule = a, this.selector = a.selectorText
            },setProperty: function(a, e) {
                var b, c = !!f.test(e), q = this.rule.style;
                if (c || q.getPropertyPriority && q.getPropertyPriority(a) == I) {
                    if (e = e.replace(f, ""), b = j(a, e)) {
                        var p = b.key;
                        q.setProperty ? (c || q.removeProperty(p), q.setProperty(p, b.value, c ? I : "")) : q.cssText = q.cssText.replace(RegExp(q[p] ? p + "\\s*:\\s*" + q[p] + "(\\s*!" + I + ")?\\s*;?" : "^", "i"), 
                        p + ": " + b.value + (c ? " !" + I : "") + ";")
                    }
                } else
                    l.setStyleProperty(this.rule, a, e)
            },setStyle: function(a) {
                Object.iterate(a, this.setProperty, this)
            },clear: function() {
                this.rule.style.cssText = ""
            },destroy: function() {
                delete this.rule
            }}), z = y(null, {className: "Basis.DOM.Style.CssRuleWrapperSet",rules: null,init: function(a) {
                this.rules = a
            },destroy: function() {
                delete this.rules
            }});
        ["setProperty", "setStyle", "clear"].forEach(function(a) {
            z.prototype[a] = function() {
                for (var e, b = 0; e = this.rules[b]; b++)
                    e[a].apply(e, arguments)
            }
        });
        l.extend({setStyleProperty: e,setStyle: x,display: m,show: function(a) {
                return m(a, 1)
            },hide: function(a) {
                return m(a)
            },visibility: d,visible: function(a) {
                return d(a, 1)
            },invisible: function(a) {
                return d(a)
            }});
        return A("Basis.DOM.Style").extend({setStyleProperty: e,setStyle: x,cssRule: function(a, e) {
                return c(e, !0).getRule(a, !0)
            },getStyleSheet: c,addStyleSheet: b,CssStyleSheetWrapper: E,CssRuleWrapper: F,CssRuleWrapperSet: z})
    })();
    (function() {
        var a = l.createElement("", "a", "b").cloneNode(!0).childNodes.length == 1, b = y(null, 
        {className: "Basis.Html.Template",init: function(a) {
                this.source = a
            },parse: function() {
                function b(e, c, q) {
                    for (var e = e.split(/\{([a-z0-9\_]+(?:\|[^}]*)?)\}/i), g = [], o, E = 0; E < e.length; E++)
                        E % 2 ? (o = e[E].split(/\|/), p[o[0]] = c + "childNodes[" + q + "]", o = o.length > 1 ? o[1] : o[0]) : o = e[E].length ? e[E] : null, o != null && (a && (g.length && g.push(document.createComment("")), q++), g.push(o), q++);
                    return l.createFragment.apply(null, g)
                }
                function c(a, q) {
                    for (var E = l.createFragment(), D; D = j.exec(e); ) {
                        e = RegExp.rightContext;
                        var m = RegExp.leftContext;
                        m.length && (m = b(m, a, q), q += m.childNodes.length, E.appendChild(m));
                        if (D[6]) {
                            if (D[6] == g.last())
                                return g.pop(), E
                        } else {
                            var m = D[1], d = D[3], f = D[4];
                            D = !!D[5];
                            d && (p[d] = a + "childNodes[" + q + "]");
                            if (f)
                                var G = [], f = f.replace(/("(\\"|[^"])*?"|'([^']|\\')*?')/g, function(a) {
                                    G.push(a);
                                    return "\x00"
                                }).trim().replace(/([a-z0-9\_]+)(\{([a-z0-9\_\|]+)\})?(=\0)?\s*/gi, function(e, b, c, g, o) {
                                    g && (p[g] = a + "childNodes[" + q + '].getAttributeNode("' + b + '")');
                                    o && (o = G.shift());
                                    return b == "class" ? z.makeClassName(o.replace(/^([\'\"]?)(.*?)\1$/, "$2")) : 
                                    "[" + b + (o ? "=" + o : "") + "]"
                                });
                            d = l.createElement(m + f);
                            e.length && !D && (g.push(m), d.appendChild(c(a + "childNodes[" + q + "].", 0)));
                            E.appendChild(d);
                            q++
                        }
                    }
                    e.length && b(e);
                    return E
                }
                if (!this.proto) {
                    var e = this.source, p = {}, g = [];
                    if (typeof e == "function")
                        this.source = e = e();
                    for (var j = /<([a-z0-9\_]+)(\{([a-z0-9\_\|]+)\})?([^>\/]*)(\/?)>|<\/([a-z0-9\_]+)>/i, D = c("", 0), m = [], d = i(p).map(function(a) {
                        for (var e = p[a].replace(/\.?childNodes\[(\d+)\]/g, "$1 ").qw(), b = p[a].split("."), c = D, q = 0; q < e.length; q++)
                            isNaN(e[q]) || (c = c.childNodes[e[q]], 
                            c == c.parentNode.firstChild ? b[q] = "firstChild" : c == c.parentNode.lastChild && (b[q] = "lastChild"));
                        a = a.split(/\|/);
                        m.push.apply(m, a);
                        return {name: "object." + a.first(),alias: "object." + a.reverse().join(" = object."),path: "html." + b.join(".")}
                    }, this).sortAsObject("path"), q = 0; q < d.length; q++)
                        for (var f = RegExp("^" + d[q].path.forRegExp()), E = q + 1; E < d.length; E++)
                            d[E].path = d[E].path.replace(f, d[q].name);
                    this.proto = D;
                    this.createInstance = new Function("object", "object = object || {};var html = this.proto.cloneNode(true);" + 
                    d.map(String.format, "{alias} = {path};").join("") + "return object;");
                    this.clearInstance = new Function("object", m.map(String.format, "delete object.{0};").join(""))
                }
            },createInstance: function(a) {
                this.parse();
                return this.createInstance(a)
            },clearInstance: function() {
            }}), c = document.createElement("DIV");
        return A("Basis.Html").extend({Template: b,escape: function(a) {
                return l.createElement("DIV", l.createText(a)).innerHTML
            },unescape: function(a) {
                c.innerHTML = a;
                return c.firstChild.nodeValue
            },string2Html: function(a) {
                c.innerHTML = 
                a;
                return l.createFragment.apply(null, Array.from(c.childNodes))
            }})
    })();
    var j = function() {
        function a(a) {
            return a || window.event
        }
        function b(a) {
            return typeof a == "string" ? l.get(a) : a
        }
        function c(e) {
            e = a(e);
            e.stopPropagation ? e.stopPropagation() : e.cancelBubble = !0
        }
        function g(e) {
            e = a(e);
            e.preventDefault ? e.preventDefault() : e.returnValue = !1
        }
        function m(a) {
            var e = Array.from(i[a.type]);
            if (e)
                for (var b = e.length; b--; ) {
                    var c = e[b];
                    c.handler.call(c.thisObject, a)
                }
        }
        function e(e, c, g, o) {
            e = b(e);
            if (!e)
                throw Error("Event.addHandler: can't attach event listener to undefined");
            if (typeof g != "function")
                throw Error("Event.addHandler: handler must be a function");
            e[h] || (e[h] = {});
            var j = e[h], x = j[c];
            if (!x)
                x = j[c] = [], x.fireEvent = function(e) {
                    e = a(e);
                    if (q && e && typeof e.returnValue == "undefined") {
                        m(e);
                        if (e.cancelBubble === !0)
                            return;
                        if (typeof e.returnValue == "undefined")
                            e.returnValue = !0
                    }
                    for (var b = 0, c; c = x[b++]; )
                        c.handler.call(c.thisObject, e)
                }, e.addEventListener ? e.addEventListener(c, x.fireEvent, !1) : e.attachEvent("on" + c, x.fireEvent);
            e = {handler: g,thisObject: o};
            x.some(z, e) || x.push(e)
        }
        function x(a, 
        e, c, q) {
            var a = b(a), g = a[h];
            g && g[e] && !g[e].collapse(z, {handler: c,thisObject: q}).length && d(a, e)
        }
        function d(a, e) {
            var a = b(a), c = a[h];
            if (c)
                if (typeof e != "string")
                    for (e in c)
                        d(a, e);
                else {
                    var q = c[e];
                    q && (a.removeEventListener ? a.removeEventListener(e, q.fireEvent, !1) : a.detachEvent("on" + e, q.fireEvent), delete c[e])
                }
        }
        var f = window.document, h = "__basisEvents", z = function(a) {
            return a.handler == this.handler && a.thisObject == this.thisObject
        }, i = {}, q = !f.addEventListener, G = function() {
            function a() {
                c++ || setTimeout(function() {
                    for (var a = 
                    0; a < q.length; a++)
                        q[a].callback.call(q[a].thisObject)
                }, 10)
            }
            var c = !1, q = [];
            if (C.is("ie7-"))
                (function() {
                    var e = "_" + (new Date - 0);
                    f.write('<script id="' + e + '" defer src="//:"><\/script>');
                    b(e).onreadystatechange = function() {
                        this.readyState == "complete" && (l.remove(this), a())
                    }
                })();
            else if (C.is("safari525-"))
                var g = setInterval(function() {
                    /loaded|complete/.test(f.readyState) && (clearInterval(g), a())
                }, 15);
            else
                e(f, "DOMContentLoaded", a, !1);
            e(f, "load", a, !1);
            e(window, "load", a, !1);
            return function(a, e) {
                c || q.push({callback: a,
                    thisObject: e})
            }
        }();
        return A("Basis.Event", a).extend({KEY: {BACKSPACE: 8,TAB: 9,CTRL_ENTER: 10,ENTER: 13,SHIFT: 16,CTRL: 17,ALT: 18,ESC: 27,ESCAPE: 27,SPACE: 32,PAGEUP: 33,PAGEDOWN: 34,END: 35,HOME: 36,LEFT: 37,UP: 38,RIGHT: 39,DOWN: 40,INSERT: 45,DELETE: 46,F5: 116},MOUSE_LEFT: {VALUE: 1,BIT: 1},MOUSE_RIGHT: {VALUE: 3,BIT: 2},MOUSE_MIDDLE: {VALUE: 2,BIT: 4},Handler: function(a, e) {
                this.handler = a;
                this.thisObject = e
            },sender: function(e) {
                e = a(e);
                return e.target || e.srcElement
            },cancelBubble: c,cancelDefault: g,kill: function(a, q) {
                (q = b(q)) ? 
                e(q, a, j.kill) : (g(a), c(a))
            },key: function(e) {
                e = a(e);
                return e.keyCode || e.which || 0
            },charCode: function(e) {
                e = a(e);
                return e.charCode || e.keyCode || 0
            },mouseButton: function(e, b) {
                var e = a(e), c = "buttons" in e ? e.buttons : e.which;
                return typeof c == "number" ? c == b.VALUE : e.button & b.BIT
            },mouseX: function(e) {
                e = a(e);
                return "pageX" in e ? e.pageX : e.clientX + (f.documentElement.scrollLeft || f.body.scrollLeft)
            },mouseY: function(e) {
                e = a(e);
                return "pageY" in e ? e.pageY : e.clientY + (f.documentElement.scrollTop || f.body.scrollTop)
            },addGlobalHandler: function(a, 
            b, c) {
                var q = i[a];
                if (q)
                    for (a = q.length; a--; ) {
                        var p = q[a];
                        if (p.handler === b && p.thisObject === c)
                            return
                    }
                else
                    f.addEventListener ? f.addEventListener(a, m, !0) : e(f, a, v), q = i[a] = [];
                q.push({handler: b,thisObject: c})
            },removeGlobalHandler: function(a, e, b) {
                var c = i[a];
                c && c.collapse(z, {handler: e,thisObject: b});
                c.length || (delete i[a], f.removeEventListener ? f.removeEventListener(a, m, !0) : x(f, a, v))
            },addHandler: e,addHandlers: function(a, b, c) {
                for (var q in b)
                    e(a, q, b[q], c)
            },removeHandler: x,clearHandlers: d,fireEvent: function(a, e) {
                var a = 
                b(a), c = a[h];
                c && c[e] && c[e].fireEvent()
            },onLoad: G,onUnload: function(a, b) {
                e(window, "unload", a, b)
            }})
    }(), z = function() {
        function a(a, b) {
            return a == 0 || isNaN(a) ? "0" : a + b
        }
        var b = y(null, {className: "Basis.CSS.ClassName",init: function(a) {
                this.element = typeof a == "string" ? l.get(a) : a;
                this.sync()
            },sync: function() {
                this.cache = this.element.className.qw()
            },toArray: function() {
                return this.cache
            },has: function(a) {
                return this.cache.has(a)
            },absent: function(a) {
                return !this.has(a)
            },set: function(a) {
                this.element.className = (this.cache = 
                a.qw()).join(" ");
                return this
            },add: function(a) {
                var b = this.cache, c = b.length, e = arguments;
                e.length == 1 ? b.add(a) : b.forEach.call(e, b.add, b);
                if (b.length > c)
                    this.element.className = b.join(" ");
                return this
            },remove: function(a) {
                var b = this.cache, c = b.length, e = arguments;
                e.length == 1 ? b.remove(a) : b.forEach.call(e, b.remove, b);
                if (b.length < c)
                    this.element.className = b.join(" ");
                return this
            },replace: function(a, b, c) {
                var e = this.cache, p = 0, c = c || "";
                typeof a != "undefined" && (p += e.remove(c + a));
                typeof b != "undefined" && (p += e.add(c + b));
                if (p)
                    this.element.className = e.join(" ");
                return this
            },clear: function() {
                this.element.className = this.cache.clear();
                return this
            },bool: function(a, b) {
                b ? this.add(a) : this.remove(a);
                return this
            },toggle: function(a) {
                var b = this.has(a);
                b ? this.remove(a) : this.add(a);
                return !b
            }});
        return A("Basis.CSS").extend({cssClass: function(a) {
                return new b(a)
            },makeClassName: function(a) {
                return a != null ? String.trim(a).replace(/^(.)|\s+|\s*,\s*/g, ".$1") : ""
            },em: function(b) {
                return a(b, "em")
            },ex: function(b) {
                return a(b, "ex")
            },px: function(b) {
                return a(b, 
                "px")
            },percent: function(b) {
                return a(b, "%")
            }})
    }(), c = function() {
        var a = [];
        j.onUnload(function() {
            b.globalDestroy = !0;
            b.add = w;
            b.remove = w;
            for (var c; c = a.pop(); )
                if (typeof c.destroy == "function")
                    try {
                        c.destroy()
                    } catch (g) {
                    }
                else
                    for (var j in c)
                        delete c[j];
            a.clear()
        });
        var b = {add: function(b) {
                b != null && a.push(b)
            },remove: function(b) {
                a.remove(b)
            }};
        return b
    }();
    (function() {
        function a(a) {
            if (b) {
                if (a.source != window || a.data != c)
                    return;
                j.kill(a)
            }
            g.length && (a = g.shift(), delete l[a.key], a.fn())
        }
        var b = typeof window.addEventListener == 
        "function" && typeof window.postMessage == "function", c = "zeroTimeoutMessage", g = [], l = {}, e = 1;
        b && window.addEventListener("message", a, !0);
        var x = setTimeout;
        window.setTimeout = function(j, m) {
            var d;
            m ? d = x.call(window, j, m) : (d = {key: "z" + e++,fn: typeof j == "function" ? j : new Function(j)}, l[d.key] = d, g.push(d), b ? postMessage(c, "*") : d.timer = x.call(window, a, 0), d = d.key);
            return d
        };
        var m = clearTimeout;
        window.clearTimeout = function(a) {
            if (/z\d+/.test(a)) {
                var e = l[a];
                e && (clearTimeout(e.timer), g.remove(e), delete l[a])
            } else
                return m.call(window, 
                a)
        }
    })();
    var g = function() {
        function a() {
            if (!d)
                if (e.length) {
                    var a = Date.now(), b = Math.max(e[0].eventTime, a);
                    b < l && (clearTimeout(m), m = setTimeout(g, (l = b) - a))
                } else
                    m = clearTimeout(m), l = o
        }
        function b(c, p) {
            var q = c.eventObjectId, g = x[p] && x[p][q];
            g && (e.splice(e.binarySearchPos(g), 1), delete x[p][q], a())
        }
        function g() {
            var b = Date.now(), b = e.binarySearchPos(b + 15, j);
            d = !0;
            e.splice(0, b).forEach(function(a) {
                delete x[a.eventName][a.object.eventObjectId];
                a.callback.call(a.object)
            });
            d = !1;
            l = o;
            a()
        }
        var o = 2E12, j = u("eventTime"), e = 
        [], x = {}, l = o, m = null, d = !1;
        c.add({destroy: function() {
                d = !0;
                clearTimeout(m);
                delete e;
                delete x
            }});
        return {add: function(c, g, q) {
                var o = c.eventObjectId, l = x[g];
                l || (l = x[g] = {});
                var m = l[o];
                if (m) {
                    if (isNaN(q))
                        return b(c, g);
                    if (m.eventTime == q)
                        return;
                    e.splice(e.binarySearchPos(m), 1);
                    m.eventTime = q
                } else {
                    if (isNaN(q))
                        return;
                    m = l[o] = {eventName: g,object: c,eventTime: q,callback: c[g]}
                }
                e.splice(e.binarySearchPos(q, j), 0, m);
                a()
            },remove: b}
    }();
    if (C.test("IE7-"))
        try {
            document.execCommand("BackgroundImageCache", !1, !0)
        } catch (m) {
        }
    j.onLoad(function() {
        z.cssClass(document.body).bool("opacity-not-support", 
        !C.FeatureSupport["css-opacity"])
    });
    A("Basis").extend({namespace: A,EventObject: b,TimeEventManager: g,Cleaner: c});
    window.Basis.Locale = {}
})();
(function() {
    function n(d) {
        return !(d % 400 && (!(d % 100) || d % 4))
    }
    function h(d, f) {
        return d == 1 ? 28 + n(f) : r[d]
    }
    function i(d, h) {
        return h.replace(f, function(b, l) {
            return A[l](d)
        })
    }
    var k = Function.getter, r = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], s = {day: 864E5,hour: 36E5,minute: 6E4,second: 1E3}, v = "year month day hour minute second millisecond".qw(), w = {}, t = {};
    Object.iterate({year: "FullYear",month: "Month",day: "Date",hour: "Hours",minute: "Minutes",second: "Seconds",millisecond: "Milliseconds"}, function(d, f) {
        w[d] = k("get" + f + "()");
        t[d] = new Function("d,v", "d.set" + f + "(v)")
    });
    var A = {y: k("getFullYear().toString().substr(2)"),Y: k("getFullYear()"),d: k("getDate()"),D: k("getDate()", "{0:02}"),m: k("getMonth() + 1"),M: k("getMonth() + 1", "{0:02}"),h: k("getHours()"),H: k("getHours()", "{0:02}"),i: k("getHours() % 12 || 12", "{0:02}"),p: k("getHours() > 12", {"true": "pm","false": "am"}),P: k("getHours() > 12", {"true": "PM","false": "AM"}),I: k("getMinutes()", "{0:02}"),s: k("getSeconds()"),S: k("getSeconds()", "{0:02}"),z: k("getMilliseconds()"),Z: k("getMilliseconds()", 
        "{0:03}")}, u = /^(\d{1,4})-(\d\d?)-(\d\d?)(?:[T ](\d\d?):(\d\d?):(\d\d?)(?:\.(\d{1,3}))?)?$/, f = /%([ymdhiszp])/ig;
    Object.extend(Date.prototype, {isLeapYear: function() {
            return n(this.getFullYear())
        },getMonthDayCount: function() {
            return h(this.getMonth(), this.getFullYear())
        },add: function(d, f) {
            var b = w[d];
            if (!b)
                throw Error("Unknown date part: " + d);
            var l;
            if (d == "year" || d == "month")
                l = this.getDate(), l > 28 && this.setDate(1);
            t[d](this, b(this) + f);
            l > 28 && (b = this.getMonthDayCount(), l > b && this.setDate(b));
            return this
        },diff: function(d, 
        f) {
            if (d == "year" || d == "month") {
                var b = Number(this) - Number(f) > 0 ? -1 : 1, l = b > 0 ? this : f, j = b > 0 ? f : this, h = l.getFullYear(), h = j.getFullYear() - h;
                if (d == "year")
                    return b * h;
                l = l.getMonth();
                j = j.getMonth();
                return b * (h ? (h > 1 ? (h - 1) * 12 : 0) + (11 - l) + (j + 1) : j - l)
            } else
                return b = Math.floor((f - this) / s[d]), b + Number(w[d](new Date(f - b * s[d])) - w[d](this) != 0)
        },set: function(d, f) {
            var b = t[d];
            if (!b)
                throw Error("Unknown date part: " + d);
            var l;
            if (d == "year" || d == "month")
                l = this.getDate(), l > 28 && this.setDate(1);
            b(this, f);
            l > 28 && (b = this.getMonthDayCount(), 
            l > b && this.setDate(b));
            return this
        },get: function(d) {
            if (w[d])
                return w[d](this);
            throw Error("Unknown date part: " + d);
        },toISODateString: function() {
            return i(this, "%Y-%M-%D")
        },toISOTimeString: function() {
            return i(this, "%H:%I:%S.%Z")
        },fromDate: function(d) {
            d instanceof Date && (this.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()), this.setTime(d.getTime()));
            return this
        },toFormat: function(d) {
            return i(this, d)
        }});
    var d = Date.prototype.toISOString;
    if (d && (new Date).toISOString().match(/Z/i))
        Date.prototype.toISOString = 
        function() {
            return d.call(this).replace(/Z/i, "")
        };
    Object.complete(Date.prototype, {toISOString: function() {
            return this.toISODateString() + "T" + this.toISOTimeString()
        },fromISOString: function(d) {
            var f = String(d).match(u);
            if (!f)
                throw Error("Value of date isn't in ISO format: " + d);
            f[2] -= 1;
            for (var d = 0, b; b = v[d]; d++)
                this.set(b, f[d + 1] || 0);
            return this
        }});
    Object.extend(Date.prototype, {toODBCDate: Date.prototype.toISODateString,toODBCTime: Date.prototype.toISOTimeString,toODBC: Date.prototype.toISOString,fromODBC: Date.prototype.fromISOString});
    var B = /\D/;
    Date.fromISOString = function() {
        function d(f, b, l, j, h, c, g) {
            return new Date(f, b - 1, l, j || 0, h || 0, c || 0, g || 0)
        }
        return function(f) {
            return d.apply(null, f.split(B))
        }
    }();
    Date.fromISOStringTZ = function() {
        function d(b, l, j, f, c, g, m) {
            return new Date(b, l - 1, j, f || 0, +(c || 0) - this, g || 0, m || 0)
        }
        var f = (new Date).getTimezoneOffset();
        return function(b) {
            var l = b.substr(10).match(/([\-\+])(\d\d?):?(\d\d?)?/) || 0;
            l && (l = f + (l[1] == "-" ? -1 : 1) * (l[3] != null ? +l[2] * 60 + +l[3] : +l[2]));
            return d.apply(l, b.split(B))
        }
    }();
    Date.timer = function(d) {
        var f = 
        d || new Date;
        f.measure = function(b) {
            return b ? ((new Date - f) / 1E3).toFixed(3) : new Date - f
        };
        return f
    };
    Basis.namespace("Basis.Date").extend({isLeapYear: n,getMonthDayCount: h,format: i})
})();
(function() {
    function n(a, b) {
        var c = {}, g;
        if (a && a.length)
            g = c.inserted = a;
        if (b && b.length)
            g = c.deleted = b;
        if (g)
            return c
    }
    function h(a) {
        return function(b) {
            if (b instanceof C && this.sources.add(b))
                return b.addHandler(a, this), a.datasetChanged.call(this, b, {inserted: b.getItems()}), this.isActiveSubscriber && this.subscriptionType & 4 && b.addSubscriber(this, 4), !0
        }
    }
    function i(a) {
        return function(b) {
            if (this.sources.remove(b))
                return b.removeHandler(a, this), a.datasetChanged.call(this, b, {deleted: b.getItems()}), this.isActiveSubscriber && 
                this.subscriptionType & 4 && b.removeSubscriber(this, 4), !0
        }
    }
    function k() {
        return function(a) {
            for (var b = Array.from(this.sources), c = 0, g; g = a[c]; c++)
                g instanceof C && (b.remove(g) || this.addSource(g));
            b.forEach(this.removeSource, this)
        }
    }
    function r(a) {
        return function() {
            for (var b = 0, c; c = this.sources[b]; b++)
                c.removeHandler(a, this), a.datasetChanged.call(this, c, {deleted: c.getItems()}), this.isActiveSubscriber && this.subscriptionType & 4 && c.removeSubscriber(this, 4);
            this.sources.clear();
            this.map_ = {}
        }
    }
    function s(a, b, c, g) {
        if (!a.length)
            return 0;
        var d, c = isNaN(c) ? 0 : c, e = isNaN(g) ? a.length - 1 : g;
        do
            if (g = c + e >> 1, cmpValue = a[g].value || 0, cmpValue === d ? (cmpValue = a[g].object.eventObjectId, d = b.object.eventObjectId) : d = b.value || 0, d < cmpValue)
                e = g - 1;
            else if (d > cmpValue)
                c = g + 1;
            else
                return d == cmpValue ? g : 0;
        while (c <= e);
        return g + (cmpValue < d)
    }
    function v(a) {
        a = parseInt(a) || 0;
        return a >= 0 ? a : 0
    }
    function w(a) {
        a = parseInt(a);
        return a >= 1 ? a : 1
    }
    var t = Basis.Class, A = Function.getter, u = {update: function(a, b) {
            this.updateCount += 1;
            this.info = a.info;
            this.dispatch("update", a, b)
        },rollbackUpdate: function(a, 
        b) {
            this.dispatch("rollbackUpdate", a, b)
        },stateChanged: function(a, b) {
            this.state = a.state;
            this.dispatch("stateChanged", a, b)
        },destroy: function() {
            this.cascadeDestroy ? this.destroy() : this.setDelegate()
        }}, f = function() {
        this.isSyncRequired() && this.syncAction()
    }, d = {stateChanged: f,subscribersChanged: f}, B = t(Basis.EventObject, {className: "Basis.Data.DataObject",state: "ready",info: null,updateCount: 0,canHaveDelegate: !0,delegate: null,cascadeDestroy: !1,collection: null,subscriberCount: 0,subscribers_: null,isActiveSubscriber: !1,
        subscriptionType: 3,syncAction: null,init: function(a) {
            this.inherit(a);
            this.subscribers_ = {};
            this.updateCount = 0;
            this.info = {};
            if (a) {
                if (typeof a.isActiveSubscriber == "boolean")
                    this.isActiveSubscriber = a.isActiveSubscriber;
                if (!isNaN(a.subscriptionType))
                    this.subscriptionType = a.subscriptionType;
                if (typeof a.cascadeDestroy == "boolean")
                    this.cascadeDestroy = a.cascadeDestroy;
                if (a.state)
                    this.state = a.state;
                var b = a.delegate;
                if (!b && a.info instanceof B)
                    b = a.info;
                if (b)
                    this.setDelegate(b);
                else if (a.info) {
                    var b = {}, c;
                    for (c in a.info)
                        this.info[c] = 
                        a.info[c], b[c] = void 0;
                    this.dispatch("update", this, b)
                }
                a.collection && this.setCollection(a.collection)
            } else
                this.state = Object(String(this.state));
            this.state == this.constructor.prototype.state && (this.behaviour.stateChanged || this.handlers_.length) && this.dispatch("stateChanged", this, void 0);
            if (c = a && a.syncAction || this.syncAction)
                this.syncAction = null, this.setSyncAction(c);
            return a || {}
        },isConnected: function(a) {
            if (a instanceof B) {
                for (; a && a !== this && a !== a.delegate; )
                    a = a.delegate;
                return a === this
            }
            return !1
        },getRootDelegate: function() {
            for (var a = 
            this; a.delegate && a.delegate !== a; )
                a = a.delegate;
            return a
        },setDelegate: function(a) {
            if (this.canHaveDelegate && this.delegate !== a) {
                var b = {}, c = this.delegate, g = this.isActiveSubscriber && this.subscriptionType & 1;
                if (c) {
                    c.removeHandler(u, this);
                    for (var d in this.info)
                        b[d] = this.info[d];
                    this.info = {};
                    g && c.removeSubscriber(this, 1);
                    delete this.delegate
                }
                if (a instanceof B && !this.isConnected(a)) {
                    g && a.addSubscriber(this, 1);
                    this.setState(a.state, a.state.data);
                    for (d in a.info)
                        d in b ? a.info[d] === b[d] && delete b[d] : b[d] = void 0;
                    this.delegate = a;
                    this.info = a.info;
                    a.addHandler(u, this)
                }
                this.dispatch("delegateChanged", this, c);
                this.dispatch("update", this, b)
            }
            return this.delegate
        },setState: function(a, b) {
            if (this.state != String(a) || this.state.data != b) {
                var c = this.state, g = this.getRootDelegate();
                if (g !== this)
                    return g.setState(a, b);
                this.state = Object(String(a));
                this.state.data = b;
                this.dispatch("stateChanged", this, c)
            }
            return this.state
        },deprecate: function() {
            this.state != "processing" && this.setState("deprecated")
        },setCollection: function(a) {
            if (this.collection != 
            a) {
                var b = this.collection;
                b && (this.isActiveSubscriber && this.subscriptionType & 2 && b.removeSubscriber(this, 2), delete this.collection);
                if (a instanceof C)
                    this.collection = a, this.isActiveSubscriber && this.subscriptionType & 2 && a.addSubscriber(this, 2);
                this.dispatch("collectionChanged", this, b);
                return !0
            }
            return !1
        },update: function(a) {
            var b = this.getRootDelegate();
            if (b !== this)
                return b.update(a);
            if (a) {
                var b = {}, c = 0, g;
                for (g in a)
                    this.info[g] !== a[g] && (c++, b[g] = this.info[g], this.info[g] = a[g]);
                if (c)
                    return this.updateCount += 
                    c, this.dispatch("update", this, b), b
            }
            return !1
        },addSubscriber: function(a, b) {
            var c = b + "_" + a.eventObjectId;
            return !this.subscribers_[c] ? (this.subscribers_[c] = a, this.subscriberCount += 1, this.dispatch("subscribersChanged"), !0) : !1
        },removeSubscriber: function(a, b) {
            var c = b + "_" + a.eventObjectId;
            return this.subscribers_[c] ? (delete this.subscribers_[c], this.subscriberCount -= 1, this.dispatch("subscribersChanged"), !0) : !1
        },setIsActiveSubscriber: function(a) {
            if (this.isActiveSubscriber != !!a) {
                var b = this.delegate, c = this.collection, 
                g = this.subscriptionType;
                b && g & 1 && (a ? b.addSubscriber(this, 1) : b.removeSubscriber(this, 1));
                c && g & 2 && (a ? c.addSubscriber(this, 2) : c.removeSubscriber(this, 2));
                this.isActiveSubscriber = !!a;
                this.dispatch("isActiveStateChanged");
                return !0
            }
            return !1
        },setSubscriptionType: function(a) {
            var b = this.subscriptionType;
            if (b != a) {
                if (this.isActiveSubscriber) {
                    var c = this.delegate, g = this.collection, d = g && a & 2 ^ b & 2;
                    c && a & 1 ^ b & 1 && (b & 1 ? c.removeSubscriber(this, 1) : c.addSubscriber(this, 1));
                    d && (b & 2 ? g.removeSubscriber(this, 2) : g.addSubscriber(this, 
                    2))
                }
                this.subscriptionType = a;
                return !0
            }
            return !1
        },isSyncRequired: function() {
            return this.subscriberCount > 0 && (this.state == "undefined" || this.state == "deprecated")
        },setSyncAction: function(a) {
            var b = this.syncAction;
            typeof a != "function" && (a = null);
            (this.syncAction = a) ? (b || this.addHandler(d), this.isSyncRequired() && this.syncAction()) : b && this.removeHandler(d)
        },destroy: function() {
            var a = this.delegate;
            if (a)
                this.info = {}, a.removeHandler(u, this), this.isActiveSubscriber && this.subscriptionType & 1 && a.removeSubscriber(this, 
                1), delete this.delegate;
            this.collection && (this.setCollection(), delete this.collection);
            this.inherit();
            delete this.state;
            delete this.subscribers_
        }}), C = t(B, {className: "Basis.Data.AbstractDataset",canHaveDelegate: !1,state: "undefined",map_: null,member_: null,cache_: [],eventCache_: null,itemCount: 0,version: 0,version_: 0,init: function(a) {
            this.inherit(a);
            this.map_ = {};
            this.member_ = {};
            this.version = this.itemCount = 0;
            this.eventCache_ = {mode: !1,delta: []}
        },has: function(a) {
            return !(!a || !this.member_[a.eventObjectId])
        },
        getItems: function() {
            if (this.version_ != this.version)
                this.version_ = this.version, this.cache_ = Object.values(this.member_);
            return this.cache_
        },sync: Function.$false,add: Function.$false,remove: Function.$false,set: Function.$false,clear: Function.$false,dispatch: function(a, b, c) {
            if (a == "datasetChanged") {
                var g;
                if (g = c.inserted) {
                    for (var d = 0, e; e = g[d]; d++)
                        this.member_[e.eventObjectId] = e;
                    this.itemCount += g.length;
                    this.version++
                }
                if (g = c.deleted) {
                    for (d = 0; e = g[d]; d++)
                        delete this.member_[e.eventObjectId];
                    this.itemCount -= 
                    g.length;
                    this.version++
                }
            }
            this.inherit.apply(this, arguments)
        },destroy: function() {
            this.clear();
            this.inherit();
            this.getItems = Function.$null;
            delete this.itemCount;
            delete this.map_;
            delete this.member_;
            delete this.cache_;
            delete this.eventCache_
        }}), y = {destroy: function(a) {
            this.map_[a.eventObjectId] && this.remove([a])
        }}, b = t(C, {className: "Basis.Data.Dataset",init: function(a) {
            this.inherit(a);
            a && a.items && this.set(a.items)
        },add: function(a) {
            for (var b, c = [], g = 0; g < a.length; g++) {
                var d = a[g];
                if (d instanceof B) {
                    var e = 
                    d.eventObjectId;
                    this.map_[e] || (this.map_[e] = d, c.push(d), d.all !== this && d.addHandler(y, this))
                }
            }
            c.length && this.dispatch("datasetChanged", this, b = {inserted: c});
            return b
        },remove: function(a) {
            for (var b, c = [], g = 0; g < a.length; g++) {
                var d = a[g];
                if (d instanceof B) {
                    var e = d.eventObjectId;
                    this.map_[e] && (delete this.map_[e], c.push(d), d.all !== this && d.removeHandler(y, this))
                }
            }
            c.length && this.dispatch("datasetChanged", this, b = {deleted: c});
            return b
        },set: function(a) {
            if (!this.itemCount)
                return this.add(a);
            if (!a.length)
                return this.clear();
            for (var b = {}, c = 0; c < a.length; c++) {
                var g = a[c];
                if (g instanceof B) {
                    var d = g.eventObjectId;
                    b[d] = g
                }
            }
            a = [];
            for (d in this.map_)
                b[d] ? delete b[d] : (g = this.map_[d], delete this.map_[d], a.push(g), g.all !== this && g.removeHandler(y, this));
            c = [];
            for (d in b)
                g = b[d], this.map_[d] = b[d], c.push(g), g.all !== this && g.addHandler(y, this);
            if (b = n(c, a))
                return this.dispatch("datasetChanged", this, b), b
        },sync: function(a, c) {
            if (a) {
                b.setAccumulateState(!0);
                for (var g = [], d = {}, j = [], e = [], x = 0; x < a.length; x++) {
                    var l = a[x];
                    if (l instanceof B) {
                        var m = l.eventObjectId;
                        d[m] = l;
                        this.map_[m] || j.push(l)
                    }
                }
                for (m in this.map_)
                    d[m] || (l = this.map_[m], e.push(l), l.destroy());
                c && j.length && (g = this.add(j));
                b.setAccumulateState(!1);
                return g
            }
        },clear: function() {
            var a, b = this.getItems();
            this.map_ = {};
            if (b.length) {
                for (a = 0; a < b.length; a++)
                    b[a].all !== this && b[a].removeHandler(y, this);
                this.dispatch("datasetChanged", this, a = {deleted: b})
            }
            return a
        }});
    (function() {
        b.setAccumulateState = function() {
        }
    })();
    var f = {datasetChanged: function(a, b) {
            var c = a.eventObjectId, g = [], d = [], e, j, l;
            if (b.inserted)
                for (var m = 
                0; e = b.inserted[m]; m++)
                    j = e.eventObjectId, l = this.map_[j], l || (l = this.map_[j] = {object: e,count: 0}, g.push(e)), l[c] || (l[c] = a, l.count++);
            if (b.deleted)
                for (m = 0; e = b.deleted[m]; m++)
                    if (j = e.eventObjectId, (l = this.map_[j]) && l[c])
                        delete l[c], l.count-- == 1 && (delete this.map_[j], d.push(e));
            (b = n(g, d)) && this.dispatch("datasetChanged", this, b)
        },destroy: function(a) {
            this.removeSource(a)
        }}, f = t(C, {className: "Basis.Data.AggregateDataset",subscriptionType: 4,sources: null,init: function(a) {
            this.sources = [];
            this.inherit(a);
            a && Array.isArray(a.sources) && 
            a.sources.forEach(this.addSource, this)
        },setIsActiveSubscriber: function(a) {
            if (this.isActiveSubscriber != !!a && this.sources.length && this.subscriptionType & 4)
                for (var b = 0; source = this.sources[b]; b++)
                    a ? source.addSubscriber(this, 4) : source.removeSubscriber(this, 4);
            return this.inherit(a)
        },setSubscriptionType: function(a) {
            var b = this.subscriptionType, c = Number(a) || 0;
            if (b != a && this.isActiveSubscriber && this.sources.length && c & 4 ^ b & 4)
                for (a = 0; source = this.sources[a]; a++)
                    c & 4 ? source.addSubscriber(this, 4) : source.removeSubscriber(this, 
                    4);
            return this.inherit(c)
        },addSource: h(f),removeSource: i(f),setSources: k(f),clear: r(f),destroy: function() {
            this.inherit();
            delete this.sources
        }}), l = {update: function(a) {
            var b = this.map_[a.eventObjectId], c = this.index(a), a = this.index_;
            if (b.value != c) {
                var g = s(a, b);
                b.value = c;
                var d = a[g - 1], e = a[g + 1];
                if (d && !(d.value <= c) || e && !(c <= e.value))
                    if (a.splice(g, 1), d = s(a, b), a.splice(d, 0, b), a.length > this.offset && (c = this.offset + this.limit, g = (g > this.offset) + (g > c), d = (d > this.offset) + (d > c), d != g)) {
                        var j, l, e = {};
                        switch (d) {
                            case 0:
                                l = 
                                a[this.offset];
                                j = g == 1 ? b : a[c];
                                break;
                            case 1:
                                l = b;
                                j = g == 0 ? a[this.offset - 1] : a[c];
                                break;
                            case 2:
                                l = a[c - 1], j = g == 1 ? b : a[this.offset - 1]
                        }
                        if (l)
                            e.inserted = [l.object];
                        if (j)
                            e.deleted = [j.object];
                        this.dispatch("datasetChanged", this, e)
                    }
            }
        }};
    l.rollbackUpdate = l.update;
    var j = {datasetChanged: function(a, b) {
            function c(a, e, b) {
                if (a) {
                    var a = a.object, g = a.eventObjectId;
                    b[g] ? delete b[g] : e[g] = a
                }
            }
            var g = a.eventObjectId, d = {}, e = {}, j, m, f, h = this.index_;
            if (b.inserted)
                for (var i = 0; j = b.inserted[i]; i++)
                    m = j.eventObjectId, f = this.map_[m], f || (f = this.map_[m] = 
                    {object: j,count: 0,value: this.index(j)}, j.addHandler(l, this), j = s(h, f), this.index_.splice(j, 0, f), h.length > this.offset && j < this.offset + this.limit && (c(h[this.offset + this.limit], e, d), c(j < this.offset ? h[this.offset] : f, d, e))), f[g] || (f[g] = a, f.count++);
            if (b.deleted)
                for (i = 0; j = b.deleted[i]; i++)
                    if (m = j.eventObjectId, (f = this.map_[m]) && f[g])
                        delete f[g], f.count-- == 1 && (f.object.removeHandler(l, this), j = s(h, f), h.length > this.offset && j < this.offset + this.limit && (c(h[this.offset + this.limit], d, e), c(j < this.offset ? h[this.offset] : 
                        f, e, d)), h.splice(j, 1), delete this.map_[m]);
            d = Object.values(d);
            e = Object.values(e);
            (b = n(d, e)) && this.dispatch("datasetChanged", this, b)
        },destroy: function(a) {
            this.removeSource(a)
        }}, j = t(f, {className: "Basis.Data.IndexedDataset",index: Function.$true,offset: 0,limit: 10,init: function(a) {
            this.index_ = [];
            if (a) {
                if (a.index)
                    this.index = A(a.index);
                if ("offset" in a)
                    this.offset = v(a.offset);
                if ("limit" in a)
                    this.limit = w(a.limit)
            }
            this.inherit(a)
        },setRange: function(a, b) {
            a = v(a);
            b = w(b);
            if (this.offset != a || this.limit != b) {
                var c = 
                [], g = [], d = this.offset + this.limit, e = a + b;
                a != this.offset && (a < this.offset ? c.push.apply(c, this.index_.slice(a, Math.min(this.offset, e))) : g.push.apply(g, this.index_.slice(this.offset, Math.min(a, d))));
                e != d && (e < d ? g.push.apply(g, this.index_.slice(Math.max(e, this.offset), d)) : c.push.apply(c, this.index_.slice(Math.max(d, a), e)));
                this.offset = a;
                this.limit = b;
                c = c.map(A("object"));
                g = g.map(A("object"));
                (delta = n(c, g)) && this.dispatch("datasetChanged", this, delta)
            }
        },addSource: h(j),removeSource: i(j),setSources: k(j),clear: r(j)}), 
    z = {update: function(a) {
            var b = this.map_[a.eventObjectId], c = !!this.filter(a);
            if (b.state != c)
                b.state = c, this.dispatch("datasetChanged", this, c ? {inserted: [a]} : {deleted: [a]})
        }};
    z.rollbackUpdate = z.update;
    var c = {datasetChanged: function(a, b) {
            var c = a.eventObjectId, g = [], d = [], e, j, l;
            if (b.inserted)
                for (var m = 0; e = b.inserted[m]; m++)
                    j = e.eventObjectId, l = this.map_[j], l || (l = this.map_[j] = {object: e,count: 0,state: !!this.filter(e)}, e.addHandler(z, this), l.state && g.push(e)), l[c] || (l[c] = a, l.count++);
            if (b.deleted)
                for (m = 0; e = b.deleted[m]; m++)
                    if (j = 
                    e.eventObjectId, (l = this.map_[j]) && l[c])
                        delete l[c], l.count-- == 1 && (l.object.removeHandler(z, this), l.state && d.push(l.object), delete this.map_[j]);
            (b = n(g, d)) && this.dispatch("datasetChanged", this, b)
        },destroy: function(a) {
            this.removeSource(a)
        }}, c = t(f, {className: "Basis.Data.Collection",filter: Function.$true,init: function(a) {
            if (a && a.filter)
                this.filter = A(a.filter);
            this.inherit(a)
        },setFilter: function(a) {
            a = a ? A(a) : Function.$true;
            if (this.filter != a) {
                this.filter = a;
                var b = [], c = [], g, d, e, j;
                for (j in this.map_)
                    if (g = this.map_[j], 
                    d = g.object, e = !!a(d), e != g.state)
                        (g.state = e) ? b.push(d) : c.push(d);
                var l;
                (l = n(b, c)) && this.dispatch("datasetChanged", this, l)
            }
        },addSource: h(c),removeSource: i(c),setSources: k(c),clear: r(c),sync: function(a) {
            if (a) {
                b.setAccumulateState(!0);
                for (var c = {}, g = [], d = 0; d < a.length; d++) {
                    var j = a[d];
                    if (j instanceof B) {
                        var e = j.eventObjectId;
                        c[e] = j
                    }
                }
                for (e in this.map_)
                    if (this.map_[e].state && !c[e])
                        j = this.map_[e].object, g.push(j), j.destroy();
                b.setAccumulateState(!1);
                return []
            }
        },destroy: function() {
            this.inherit()
        }}), g = {update: function(a) {
            var b = 
            a.eventObjectId, c = this.map_[b].group, g = this.getGroup(this.groupGetter(a), !0);
            if (c !== g && (this.map_[b].group = g, delete c.map_[b], c.dispatch("datasetChanged", c, {deleted: [a]}), g.map_[b] = a, g.dispatch("datasetChanged", g, {inserted: [a]}), ("destroyEmpty" in c ? c.destroyEmpty : this.destroyEmpty) && !c.itemCount))
                delete this.groups_[c.groupId], delete this.map_[c.eventObjectId], c.destroy(), this.dispatch("datasetChanged", this, {deleted: [c]})
        }};
    g.rollbackUpdate = g.update;
    var m = {datasetChanged: function(a, c) {
            var d = a.eventObjectId, 
            j = [], l = [], e, m, f, h = {}, i;
            if (c.inserted) {
                b.setAccumulateState(!0);
                for (var z = 0; e = c.inserted[z]; z++)
                    m = e.eventObjectId, f = this.map_[m], f || (f = this.getGroup(this.groupGetter(e), !0), f = this.map_[m] = {object: e,count: 0,group: f}, j.push(f)), f[d] || (f[d] = a, f.count++);
                b.setAccumulateState(!1);
                for (z = 0; f = j[z]; z++)
                    e = f.object, f = f.group, m = e.eventObjectId, e.addHandler(g, this), f.map_[m] = e, i = f.eventObjectId, (m = h[i]) ? m.inserted.push(e) : h[i] = {group: f,inserted: [e],deleted: []}
            }
            if (c.deleted)
                for (z = 0; e = c.deleted[z]; z++)
                    if (m = e.eventObjectId, 
                    (f = this.map_[m]) && f[d])
                        if (delete f[d], f.count-- == 1)
                            f = f.group, e.removeHandler(g, this), delete f.map_[m], delete this.map_[m], i = f.eventObjectId, (m = h[i]) ? m.deleted.push(e) : h[i] = {group: f,deleted: [e]};
            for (i in h)
                if (c = h[i], f = c.group, c.deleted.length || delete c.deleted, f.dispatch("datasetChanged", f, c), ("destroyEmpty" in f ? f.destroyEmpty : this.destroyEmpty) && !f.itemCount)
                    l.push(f), delete this.groups_[f.groupId], delete this.map_[f.eventObjectId], f.destroy();
            l.length && this.dispatch("datasetChanged", this, {deleted: l})
        },
        destroy: function(a) {
            this.removeSource(a)
        }}, t = t(f, {className: "Basis.Data.Grouping",groupGetter: Function.$true,groupClass: C,destroyEmpty: !0,init: function(a) {
            this.groups_ = {};
            if (a) {
                if (a.groupGetter)
                    this.groupGetter = A(a.groupGetter);
                if (a.groupClass)
                    this.groupClass = a.groupClass;
                if (a.destroyEmpty === !1)
                    this.destroyEmpty = !1
            }
            this.inherit(a)
        },getGroup: function(a, b) {
            var c = a instanceof B, g = c ? a.eventObjectId : a, d = this.groups_[g];
            if (!d && b)
                d = {}, c ? d.delegate = a : d.info = {groupId: a,title: a}, d = new this.groupClass(d), d.groupId = 
                g, this.map_[d.eventObjectId] = d, this.groups_[g] = d, this.dispatch("datasetChanged", this, {inserted: [d]});
            return d
        },addSource: h(m),removeSource: i(m),setSources: k(m),clear: r(m),destroy: function() {
            this.destroyEmpty = !1;
            this.inherit();
            var a = Object.values(this.groups_);
            this.dispatch("datasetChanged", this, {deleted: a});
            for (var b = 0; b < a.length; b++)
                a[b].destroy();
            delete this.groups_
        }});
    Basis.namespace("Basis.Data").extend({STATE: {UNDEFINED: "undefined",READY: "ready",PROCESSING: "processing",ERROR: "error",DEPRECATED: "deprecated"},
        SUBSCRIPTION: {NONE: 0,DELEGATE: 1,COLLECTION: 2,MASK: 7},DataObject: B,AbstractDataset: C,Dataset: b,AggregateDataset: f,IndexedDataset: j,Collection: c,Grouping: t})
})();
(function() {
    function n(b) {
        if (b instanceof B)
            return b.set;
        b = b.nodeType;
        if (isNaN(b) == !1)
            return b == 1 ? d : "nodeValue"
    }
    var h = Basis.Class, i = Basis.DOM, k = Basis.Cleaner, r = Function.getter, s = Basis.CSS.cssClass, v = Basis.EventObject, w = Basis.TimeEventManager, t = Basis.Data, A = t.DataObject, u = t.STATE, t = h(A, {className: "Basis.Data.Property.AbstractProperty",locked: !1,lockValue_: null,init: function(b, d, j) {
            this.inherit();
            this.proxy = typeof j == "function" ? j : Function.$self;
            this.initValue = this.value = this.proxy(b);
            d && this.addHandler(d)
        },
        set: function(b, d) {
            var j = this.updateCount, f = this.value, c = this.proxy ? this.proxy(b) : c;
            if (c !== f)
                this.value = c, this.updateCount += 1;
            !this.locked && (d || j != this.updateCount) && this.dispatch("change", c, f);
            return j != this.updateCount
        },lock: function() {
            if (!this.locked)
                this.lockValue_ = this.value, this.locked = !0
        },unlock: function() {
            if (this.locked)
                this.locked = !1, this.value !== this.lockValue_ && this.dispatch("change", this.value, this.lockValue_)
        },update: function(b, d) {
            return this.set(b, d)
        },reset: function() {
            this.set(this.initValue)
        },
        toString: function() {
            return this.value != null && this.value.constructor == Object ? String(this.value) : this.value
        },destroy: function() {
            this.inherit();
            delete this.initValue;
            delete this.proxy;
            delete this.lockValue_;
            delete this.value
        }}), f = {destroy: function(b) {
            this.removeLink(b)
        }}, d = function(b) {
        i.insert(i.clear(this), b)
    }, B = h(t, {className: "Basis.Data.Property.Property",links_: null,behaviour: {change: function(b, d) {
                if (this.links_.length && !k.globalDestroy)
                    for (var j = 0, f; f = this.links_[j++]; )
                        this.power_(f, d)
            }},init: function(b, 
        d, j) {
            this.inherit(b, d, j);
            this.links_ = [];
            k.add(this)
        },addLink: function(b, d, j) {
            if (typeof b != "object" && b instanceof Object == !1)
                throw Error("Basis.Data.Property: Link to undefined object ignored");
            d == null && (d = n(b));
            typeof j != "function" && (j = r(Function.$self, j));
            d = {object: b,format: j,field: d,isEventObject: b instanceof v};
            this.links_.push(d);
            d.isEventObject && b.addHandler(f, this);
            this.power_(d);
            return b
        },addLinkShortcut: function(b, d, j) {
            return this.addLink(b, B.shortcut[d], j)
        },removeLink: function(b, d) {
            if (this.links_ != 
            null) {
                var j = arguments.length < 2;
                !j && d == null && (d = n(b));
                for (var h = 0, c = 0, g; g = this.links_[c]; c++)
                    g.object === b && (j || d == g.field) ? g.isEventObject && g.object.removeHandler(f, this) : this.links_[h++] = g;
                this.links_.length = h
            }
        },clear: function() {
            for (var b = 0, d; d = this.links_[b]; b++)
                d.isEventObject && d.object.removeHandler(f, this);
            this.links_.clear()
        },power_: function(b, d) {
            var j = b.field;
            if (j != null) {
                var f = b.format(this.value), c = b.object;
                typeof j == "function" ? j.call(c, f, arguments.length < 2 ? f : b.format(d)) : c[j] = f
            }
        },destroy: function() {
            this.clear();
            delete this.links_;
            this.inherit();
            k.remove(this)
        }});
    B.shortcut = {className: function(b, d) {
            s(this).replace(d, b)
        },show: function(b) {
            i.display(this, !!b)
        },hide: function(b) {
            i.display(this, !b)
        },disable: function(b) {
            this.disabled = !!b
        },enable: function(b) {
            this.disabled = !b
        }};
    var C = [u.READY, u.DEPRECATED, u.UNDEFINED, u.ERROR, u.PROCESSING], y = {stateChanged: function() {
            this.fire(!1, !0)
        },update: function() {
            this.fire(!0)
        },change: function() {
            this.fire(!0)
        },destroy: function(b) {
            this.remove(b)
        }}, h = h(B, {className: "Basis.Data.Property.DataObjectSet",
        calculateValue: function() {
            return this.value + 1
        },objects: [],timer_: null,valueChanged_: !1,stateChanged_: !0,state: u.UNDEFINED,init: function(b) {
            b = b || {};
            this.inherit("value" in b ? b.value : 0, b.handlers, b.proxy);
            this.objects = [];
            if (typeof b.calculateValue == "function")
                this.calculateValue = b.calculateValue;
            b.objects && (this.lock(), this.add.apply(this, b.objects), this.unlock());
            this.valueChanged_ = this.stateChanged_ = !!b.calculateOnInit;
            this.update();
            k.add(this)
        },add: function() {
            for (var b = 0, d = arguments.length; b < d; b++) {
                var j = 
                arguments[b];
                if (j instanceof A)
                    this.objects.add(j) && j.addHandler(y, this);
                else
                    throw Error("Basis.Data.Property: Instance of DataObject required");
            }
            this.fire(!0, !0)
        },remove: function(b) {
            this.objects.remove(b) && b.removeHandler(y, this);
            this.fire(!0, !0)
        },clear: function() {
            for (var b = 0, d; d = this.objects[b]; b++)
                d.removeHandler(y, this);
            this.objects.clear();
            this.fire(!0, !0)
        },fire: function(b, d) {
            if (!this.locked && (this.valueChanged_ = this.valueChanged_ || !!b, this.stateChanged_ = this.stateChanged_ || !!d, !this.timer_ && 
            (this.valueChanged_ || this.stateChanged_)))
                this.timer_ = !0, w.add(this, "update", Date.now())
        },lock: function() {
            this.locked = !0
        },unlock: function() {
            this.locked = !1
        },update: function() {
            delete this.timer_;
            w.remove(this, "update");
            if (!k.globalDestroy && (this.valueChanged_ && this.set(this.calculateValue()), this.stateChanged_)) {
                var b = this.objects.length;
                if (b) {
                    for (var d = -2, j, f = 0; f < b; f++) {
                        var c = this.objects[f], g = C.indexOf(String(c.state));
                        g > d && (j = c, d = g)
                    }
                    j && this.setState(j.state, j.state.data)
                } else
                    this.setState(u.UNDEFINED)
            }
            this.stateChanged_ = 
            this.valueChanged_ = !1
        },destroy: function() {
            this.lock();
            this.clear();
            w.remove(this, "update");
            this.inherit()
        }});
    Basis.namespace("Basis.Data.Property").extend({DataObjectSet: h,AbstractProperty: t,Property: B,PropertySet: h})
})();
(function() {
    function n(a) {
        return a.sortingValue
    }
    function h(a, e) {
        a.childNodes.set(e);
        a.firstChild = e[0] || null;
        a.lastChild = e[e.length - 1] || null;
        for (var b = e.length - 1; b >= 0; b--)
            e[b].nextSibling = e[b + 1] || null, e[b].previousSibling = e[b - 1] || null, a.insertBefore(e[b], e[b].nextSibling)
    }
    function i(a, e) {
        var b = a.childFactory || a.document && a.document.childFactory, c;
        e instanceof l && (e = {delegate: e});
        b && (c = b.call(a, e));
        if (!c)
            throw Error("Basis.DOM.Wrapper: Child node is null");
        if (!(c instanceof a.childClass))
            throw Error("Basis.DOM.Wrapper: Child node has wrong class (expected " + 
            (a.childClass && a.childClass.className) + " but " + (c && c.className) + ")");
        return c
    }
    var k = Basis.Class, r = Basis.DOM, s = Basis.Event, v = Basis.Html.Template, w = Basis.EventObject, t = Basis.EventObject.createBehaviour, A = Basis.Cleaner, u = Basis.TimeEventManager, f = Function.getter, d = Basis.CSS.cssClass, B = Object.extend, C = Object.complete, y = Basis.Data, b = y.SUBSCRIPTION, l = y.DataObject, j = y.AbstractDataset, y = y.Dataset, z = k(l, {className: "Basis.DOM.Wrapper.AbstractNode",behaviour: {update: function(a, e) {
                var b = this.parentNode;
                b && (this.parentNode.dispatch("childUpdated", 
                this, this.info, [this.info, e].merge(), e), b.matchFunction && (this.match(), this.match(b.matchFunction)), b.firstChild !== b.lastChild && b.insertBefore(this, this.nextSibling))
            }},autoDelegateParent: !1,nodeType: "DOMWrapperNode",canHaveChildren: !1,childNodes: [],colMap_: null,destroyCollectionMember: !0,document: null,parentNode: null,nextSibling: null,previousSibling: null,firstChild: null,lastChild: null,positionDependent: !1,localSorting: null,localSortingDesc: !1,localGrouping: null,groupNode: null,groupControl: null,groupControlClass: null,
        init: function(a) {
            a = a || {};
            if (typeof a.autoDelegateParent == "boolean")
                this.autoDelegateParent = a.autoDelegateParent;
            if (typeof a.positionDependent == "boolean")
                this.positionDependent = a.positionDependent;
            if (a.localSorting)
                this.localSorting = f(a.localSorting);
            if (typeof a.localSortingDesc == "boolean")
                this.localSortingDesc = a.localSortingDesc;
            if ("localGrouping" in a)
                this.localGrouping = a.localGrouping;
            if (a.document)
                this.document = a.document;
            this.localGrouping && this.setLocalGrouping(this.localGrouping);
            if (this.canHaveChildren)
                this.childNodes = 
                [];
            a = this.inherit(a);
            this.canHaveChildren && !this.collection && a.childNodes && this.setChildNodes(a.childNodes);
            return a
        },appendChild: function() {
        },insertBefore: function() {
        },removeChild: function() {
        },replaceChild: function() {
        },clear: function() {
        },hasChildNodes: function() {
            return this.childNodes.length > 0
        },setChildNodes: function() {
        },setLocalGrouping: function() {
        },setLocalSorting: function() {
        },destroy: function() {
            var a = this.collection;
            this.inherit();
            this.groupControl && (this.groupControl.destroy(), delete this.groupControl);
            !a && this.firstChild && this.clear();
            this.parentNode && this.parentNode.removeChild(this);
            delete this.document;
            delete this.parentNode;
            delete this.nextSibling;
            delete this.previousSibling;
            delete this.childNodes;
            delete this.firstChild;
            delete this.lastChild;
            delete this.info;
            delete this.config
        }}), c = k(z, {className: "Basis.DOM.Wrapper.PartitionNode",canHaveChildren: !0,titleGetter: f("info.title"),autoDestroyIfEmpty: !0,init: function(a) {
            if (typeof a == "object") {
                if (typeof a.autoDestroyIfEmpty == "boolean")
                    this.autoDestroyIfEmpty = 
                    !!a.autoDestroyIfEmpty;
                if (a.titleGetter)
                    this.titleGetter = f(a.titleGetter)
            }
            return this.inherit(a)
        },setTitleGetter: function(a) {
            a = f(a);
            if (this.titleGetter !== a)
                this.titleGetter = a, this.dispatch("update", this, {})
        },appendChild: function(a) {
            return this.insertBefore(a)
        },insertBefore: function(a, e) {
            var b = e ? this.childNodes.indexOf(e) : -1;
            b == -1 ? this.childNodes.push(a) : this.childNodes.splice(b, 0, a);
            this.firstChild = this.childNodes[0];
            this.lastChild = this.childNodes.last();
            a.groupNode = this;
            this.dispatch("childNodesModified", 
            this, {inserted: [a]});
            return a
        },removeChild: function(a) {
            var e = this.childNodes.indexOf(a);
            if (e != -1)
                this.childNodes.splice(e, 1), this.firstChild = this.childNodes[0] || null, this.lastChild = this.childNodes.last() || null, a.groupNode = null, this.dispatch("childNodesModified", this, {deleted: [a]});
            !this.firstChild && this.autoDestroyIfEmpty && this.destroy();
            return a
        },clear: function() {
            if (this.firstChild) {
                for (var a = 0, e; e = this.childNodes[a]; a++)
                    e.groupNode = null;
                a = Array.from(this.childNodes);
                this.childNodes.clear();
                this.firstChild = 
                this.lastChild = null;
                this.dispatch("childNodesModified", this, {deleted: a.reverse()});
                this.autoDestroyIfEmpty && this.destroy()
            }
        }}), g = k(z, {className: "Basis.DOM.Wrapper.InteractiveNode",selectable: !0,selected: !1,controlSelection: null,selection: null,matchFunction: null,matched: !0,disabled: !1,init: function(a) {
            if (typeof a == "object") {
                if (a.selection instanceof N)
                    this.selection = a.selection;
                if (a.selectable == !1)
                    this.selectable = !1
            }
            a = this.inherit(a);
            a.disabled && this.disable();
            a.selected && this.select(!0);
            return a
        },
        setSelection: function(a) {
            if (this.selection == a)
                return !1;
            var e = this.selection;
            r.axis(this, r.AXIS_DESCENDANT, function(b) {
                if (b.controlSelection == e)
                    b.selected && e && e.remove([b]), b.controlSelection = a
            });
            this.selection = a;
            return !0
        },hasOwnSelection: function() {
            return !!this.selection
        },select: function(a) {
            var e = this.selected, b = this.controlSelection;
            if (b)
                a ? e ? b.remove([this]) : b.add([this]) : b.set([this]);
            else if (!e && this.selectable && !this.isDisabled())
                this.selected = !0, this.dispatch("select");
            return this.selected != 
            e
        },unselect: function() {
            var a = this.selected;
            if (a) {
                var e = this.controlSelection;
                e ? e.remove([this]) : (this.selected = !1, this.dispatch("unselect"))
            }
            return this.selected != a
        },enable: function() {
            if (this.disabled)
                this.disabled = !1, this.dispatch("enable")
        },disable: function() {
            if (!this.disabled)
                this.disabled = !0, this.dispatch("disable")
        },isDisabled: function() {
            return this.disabled || this.document && this.document.disabled || !!r.parent(this, f("disabled"))
        },setMatchFunction: function() {
        },match: function(a) {
            if (typeof a != "function") {
                if (this.matched && 
                this.underMatch)
                    this.underMatch(this, !0), delete this.underMatch;
                else if (!this.matched)
                    this.matched = !0, this.dispatch("match");
                return !0
            }
            if (a(this)) {
                if (this.underMatch = a, !this.matched)
                    this.matched = !0, this.dispatch("match")
            } else if (delete this.underMatch, this.matched)
                this.matched = !1, this.dispatch("unmatch");
            return this.matched
        },destroy: function() {
            this.hasOwnSelection() && (this.selection.destroy(), delete this.selection);
            this.unselect();
            this.inherit()
        }}), m = {datasetChanged: function(a, e) {
            var b = {}, c = [];
            if (e.deleted)
                if (this.childNodes.length == 
                e.deleted.length) {
                    var c = Array.from(this.childNodes), g = this.collection;
                    this.collection = null;
                    this.clear(!0);
                    this.collection = g
                } else {
                    for (var g = 0, d; d = e.deleted[g]; g++)
                        d = this.colMap_[d.eventObjectId], d.canHaveDelegate = !0, c.push(this.removeChild(d));
                    b.deleted = c
                }
            if (e.inserted) {
                b.inserted = [];
                for (g = 0; d = e.inserted[g]; g++) {
                    var j = i(this, {isActiveSubscriber: !1,cascadeDestroy: !1,delegate: d});
                    j.canHaveDelegate = !1;
                    this.colMap_[d.eventObjectId] = j;
                    b.inserted.push(j);
                    this.firstChild && this.insertBefore(j)
                }
            }
            this.firstChild ? 
            this.dispatch("childNodesModified", this, b) : this.setChildNodes(b.inserted);
            this.destroyCollectionMember && c.length && c.forEach(f("destroy()"))
        },destroy: function(a) {
            this.collection === a && this.setCollection()
        }}, a = {canHaveChildren: !0,childClass: z,childFactory: null,positionUpdateTimer_: null,minPosition_: 1E12,maxPosition_: 0,updatePositions_: function(a, e) {
            if (this.positionDependent && (this.minPosition_ = Math.min(this.minPosition_, a, e), this.maxPosition_ = Math.max(this.maxPosition_, a, e), !this.positionUpdateTimer_))
                this.positionUpdateTimer_ = 
                function() {
                    var a = Math.min(this.maxPosition_ + 1, this.childNodes.length), e = this.childNodes[this.minPosition_], b = e && e.groupNode, c = this.minPosition_;
                    b && (c = b.childNodes.indexOf(e));
                    for (e = this.minPosition_; e < a; e++, c++) {
                        var g = this.childNodes[e];
                        if (g.groupNode != b)
                            c = 0, b = g.groupNode;
                        g.dispatch("updatePosition", e, c)
                    }
                    delete this.minPosition_;
                    delete this.maxPosition_;
                    delete this.positionUpdateTimer_
                }, u.add(this, "positionUpdateTimer_", Date.now())
        },appendChild: function(a) {
            return this.insertBefore(a)
        },insertBefore: function(a, 
        e) {
            if (!this.canHaveChildren)
                throw Error("Basis.DOM.Wrapper: Node can't be inserted at specified point in hierarchy");
            if (a.firstChild && r.axis(this, r.AXIS_ANCESTOR_OR_SELF).has(a))
                throw Error("Basis.DOM.Wrapper: Node can't be inserted at specified point in hierarchy");
            if (this.collection && !this.collection.has(a.delegate))
                throw Error("Basis.DOM.Wrapper: Operation is not allowed because node is under collection control");
            a instanceof this.childClass == !1 && (a = i(this, a));
            var b = a.parentNode === this, c = this.localSorting, 
            g = this.childNodes;
            if (this.localGrouping) {
                var g = 0, d = this.groupControl.getGroupNode(a), j = d.childNodes, f = a.groupNode;
                if (b && a.nextSibling === e && f === d)
                    return a;
                this.localSorting ? (c = c(a), g = j.binarySearchPos(c, n, this.localSortingDesc), a.sortingValue = c) : g = e && e.groupNode === d ? j.indexOf(e) : j.length;
                e = j[g];
                if (!e && g >= j.length)
                    for (c = d; c = c.nextSibling; )
                        if (e = c.firstChild)
                            break;
                if (a === e || b && a.nextSibling === e)
                    return f !== d && (f && f.removeChild(a), d.insertBefore(a), g = this.childNodes.indexOf(a), this.updatePositions_(g, g)), 
                    a
            } else if (c) {
                var c = c(a), f = this.localSortingDesc, j = a.nextSibling, m = a.previousSibling;
                if (b) {
                    if (c === a.sortingValue)
                        return a;
                    if ((!j || (f ? j.sortingValue <= c : j.sortingValue >= c)) && (!m || (f ? m.sortingValue >= c : m.sortingValue <= c)))
                        return a.sortingValue = c, a
                }
                e = g[g.binarySearchPos(c, n, f)];
                a.sortingValue = c;
                if (a === e || b && j === e)
                    return a
            } else {
                if (e && e.parentNode !== this)
                    throw Error("Basis.DOM.Wrapper: Node was not found");
                if (b) {
                    if (a.nextSibling === e)
                        return a;
                    if (a === e)
                        throw Error("Basis.DOM.Wrapper: Node can't be inserted at specified point in hierarchy");
                }
            }
            c = -1;
            b ? (a.nextSibling ? a.nextSibling.previousSibling = a.previousSibling : this.lastChild = a.previousSibling, a.previousSibling ? a.previousSibling.nextSibling = a.nextSibling : this.firstChild = a.nextSibling, a.previousSibling = null, a.nextSibling = null, c = this.childNodes.indexOf(a), this.childNodes.splice(c, 1), a.groupNode && a.groupNode.removeChild(a)) : a.parentNode && a.parentNode.removeChild(a);
            g = e ? this.childNodes.indexOf(e) : this.childNodes.length;
            if (g == -1)
                throw Error("Basis.DOM.Wrapper: Node was not found");
            this.childNodes.splice(g, 
            0, a);
            this.updatePositions_(g, c == -1 ? this.childNodes.length - 1 : c + (g < c));
            a.groupNode != d && d.insertBefore(a, e);
            e ? a.nextSibling = e : (e = {previousSibling: this.lastChild}, this.lastChild = a);
            a.parentNode = this;
            a.previousSibling = e.previousSibling;
            g == 0 ? this.firstChild = a : e.previousSibling.nextSibling = a;
            e.previousSibling = a;
            var l = !1, p = !1, x = this.selection || this.controlSelection;
            if (!a.document && a.document !== this.document)
                l = !0, a.document = this.document;
            if (!a.controlSelection && a.controlSelection !== x)
                a.controlSelection = x, 
                p = !a.selection, a.selected && x.add([a]);
            a.firstChild && (l || p) && r.axis(a, r.AXIS_DESCENDANT).forEach(function(a) {
                if (l && !a.document)
                    a.document = this.document;
                if (p && !a.controlSelection)
                    a.selected && a.unselect(), a.controlSelection = x
            }, a);
            b || (a.match && a.match(this.matchFunction), a.autoDelegateParent && a.setDelegate(this), this.collection || this.dispatch("childNodesModified", this, {inserted: [a]}));
            return a
        },removeChild: function(a) {
            if (a == null || a.parentNode !== this)
                throw Error("Basis.DOM.Wrapper: Node was not found");
            if (a instanceof this.childClass == !1)
                throw Error("Basis.DOM.Wrapper: Child node has wrong class");
            if (this.collection && this.collection.has(a))
                throw Error("Basis.DOM.Wrapper: Operation is not allowed because node is under collection control");
            var e = this.childNodes.indexOf(a);
            this.childNodes.splice(e, 1);
            this.updatePositions_(e, this.firstChild == this.lastChild ? 0 : this.childNodes.length - 1);
            a.parentNode = null;
            var b = a.document === this.document, c = a.controlSelection === this.selection;
            a.firstChild && (b || c) && r.axis(a, 
            r.AXIS_DESCENDANT).forEach(function(a) {
                if (b && a.document == this.document)
                    a.document = null;
                if (c && a.controlSelection == this.selection)
                    a.selected && this.selection.remove([a]), a.controlSelection = null
            }, a);
            if (b)
                a.document = null;
            if (c)
                a.selected && this.selection.remove([a]), a.controlSelection = null;
            a.nextSibling ? a.nextSibling.previousSibling = a.previousSibling : this.lastChild = a.previousSibling;
            a.previousSibling ? a.previousSibling.nextSibling = a.nextSibling : this.firstChild = a.nextSibling;
            a.nextSibling = null;
            a.previousSibling = 
            null;
            a.groupNode && a.groupNode.removeChild(a);
            this.collection || this.dispatch("childNodesModified", this, {deleted: [a]});
            a.autoDelegateParent && a.setDelegate();
            return a
        },replaceChild: function(a, e) {
            if (this.collection)
                throw Error("Basis.DOM.Wrapper: Operation is not allowed because node is under collection control");
            if (e == null || e.parentNode !== this)
                throw Error("Basis.DOM.Wrapper: Node was not found");
            this.insertBefore(a, e);
            return this.removeChild(e)
        },clear: function(a) {
            if (this.collection)
                this.setCollection();
            else if (this.firstChild) {
                var e = Array.from(this.childNodes);
                this.lastChild = this.firstChild = null;
                this.childNodes.clear();
                for (this.dispatch("childNodesModified", this, {deleted: e.reverse()}); e.length; ) {
                    var b = e.pop();
                    b.parentNode = null;
                    b.groupNode = null;
                    (b.selection || b.document) && r.axis(b, r.AXIS_DESCENDANT_OR_SELF).forEach(function(a) {
                        if (this.selection && a.selection === this.selection)
                            a.selected && a.selection.remove([a]), a.selection = null;
                        if (a.document === this.document)
                            a.document = null
                    }, this);
                    a ? (b.nextSibling = null, 
                    b.previousSibling = null, b.autoDelegateParent && b.setDelegate()) : b.destroy()
                }
                if (this.groupControl)
                    for (var e = this.groupControl.childNodes, b = e.length - 1, c; c = e[b]; b--)
                        c.clear(a)
            }
        },setChildNodes: function(a, e) {
            this.collection || this.clear(!!e);
            if (a && ("length" in a == !1 && (a = [a]), a.length)) {
                this.dispatch = Function.$undef;
                for (var b = [], c = 0; c < a.length; c++)
                    b.push(this.insertBefore(a[c]));
                delete this.dispatch;
                this.dispatch("childNodesModified", this, {inserted: b})
            }
            return this.childNodes
        },setCollection: function(a) {
            if (this.canHaveChildren && 
            this.collection !== a) {
                var e = this.collection;
                e && (this.isActiveSubscriber && this.subscriptionType & b.COLLECTION && e.removeSubscriber(this, b.COLLECTION), e.removeHandler(m, this), delete this.collection, delete this.colMap_, e.itemCount && this.clear());
                if (a && a instanceof j)
                    this.collection = a, this.colMap_ = {}, a.itemCount && m.datasetChanged.call(this, a, {inserted: a.getItems()}), a.addHandler(m, this), this.isActiveSubscriber && this.subscriptionType & b.COLLECTION && a.addSubscriber(this, b.COLLECTION);
                this.dispatch("collectionChanged", 
                this, e)
            }
        },setLocalGrouping: function(a) {
            var e = !1;
            if (a) {
                var b = typeof a == "function" || typeof a == "string", c = f(b ? a : a.groupGetter), b = b ? null : a;
                if (c && (!this.groupControl || this.groupControl.groupGetter !== c)) {
                    this.localGrouping = a;
                    this.groupControl ? this.groupControl.clear() : this.groupControl = new this.groupControlClass({groupControlHolder: this,autoDestroyEmptyGroups: b ? b.autoDestroyEmptyGroups : void 0});
                    b && (this.groupControl.setLocalSorting("localSorting" in b ? b.localSorting : this.groupControl.localSorting, "localSortingDesc" in 
                    b ? b.localSortingDesc : this.groupControl.localSortingDesc), b.titleGetter && this.groupControl.setTitleGetter(b.titleGetter), typeof b.isActiveSubscriber == "boolean" && this.groupControl.setIsActiveSubscriber(b.isActiveSubscriber), typeof b.subscriptionType == "number" && this.groupControl.setSubscriptionType(b.subscriptionType), "collection" in b && this.groupControl.setCollection(b.collection));
                    this.groupControl.groupGetter = c;
                    if (this.firstChild) {
                        a = this.childNodes;
                        this.localSorting && (a = a.sortAsObject(n, null, this.localSortingDesc));
                        for (c = 0; e = a[c]; c++)
                            e.groupNode = this.groupControl.getGroupNode(e);
                        e = a;
                        for (c = 0; b = e[c]; c++)
                            b.groupNode.childNodes.push(b);
                        e.clear();
                        for (c = this.groupControl.nullGroup; c; c = c.nextSibling)
                            b = c.childNodes, c.firstChild = b[0] || null, c.lastChild = b[b.length - 1] || null, e.push.apply(e, b), c.dispatch("childNodesModified", c, {inserted: Array.from(b)});
                        h(this, a)
                    }
                    e = !0
                } else
                    b && this.groupControl && (this.groupControl.setLocalSorting("localSorting" in b ? b.localSorting : this.groupControl.localSorting, "localSortingDesc" in b ? b.localSortingDesc : 
                    this.groupControl.localSortingDesc), b.titleGetter && this.groupControl.setTitleGetter(b.titleGetter), e = !0)
            } else if (this.groupControl) {
                this.localGrouping = null;
                this.groupControl.destroy();
                delete this.groupControl;
                if (this.firstChild) {
                    a = this.childNodes;
                    this.localSorting && (a = a.sortAsObject(n, null, this.localSortingDesc));
                    for (c = 0; c < a.length; c++)
                        a[c].groupNode = null;
                    h(this, a)
                }
                e = !0
            }
            e && this.dispatch("localGroupingChanged", this)
        },setLocalSorting: function(a, e) {
            a && (a = f(a));
            if (this.localSorting != a || this.localSortingDesc != 
            !!e) {
                this.localSortingDesc = !!e;
                this.localSorting = a || null;
                if (a && this.firstChild) {
                    var b = [], c;
                    for (c = this.firstChild; c; c = c.nextSibling)
                        c.sortingValue = a(c);
                    if (this.localGrouping)
                        for (var g = this.groupControl.nullGroup; g; g = g.nextSibling)
                            c = g.childNodes, c.set(c.sortAsObject(n, null, this.localSortingDesc)), g.firstChild = c[0] || null, g.lastChild = c[c.length - 1] || null, b.push.apply(b, c);
                    else
                        b = this.childNodes.sortAsObject(n, null, this.localSortingDesc);
                    h(this, b);
                    clearTimeout(this.positionUpdateTimer_);
                    delete this.positionUpdateTimer_;
                    if (this.positionDependent)
                        for (var b = this.childNodes.length, g = this.firstChild && this.firstChild.groupNode, d = 0, j = 0; d < b; d++, j++) {
                            c = this.childNodes[d];
                            if (c.groupNode != g)
                                j = 0, g = c.groupNode;
                            c.dispatch("updatePosition", d, j)
                        }
                }
                this.dispatch("localSortingChanged", this)
            }
        },setMatchFunction: function(a) {
            if (this.matchFunction != a) {
                this.matchFunction = a;
                for (var e = this.lastChild; e; e = e.previousSibling)
                    e.match(a)
            }
            return this.matchFunction
        }}, p = k(g, a, {className: "Basis.DOM.Wrapper.Node",init: function(a) {
            if (a) {
                if (typeof a.childFactory == 
                "function")
                    this.childFactory = a.childFactory;
                if (typeof a.childClass == "function")
                    this.childClass = a.childClass
            }
            return this.inherit(a)
        }}), D = k(z, a, {className: "Basis.DOM.Wrapper.GroupControl",map_: {},autoDestroyEmptyGroups: !0,groupTitleGetter: f("info.title"),childClass: c,childFactory: function(a) {
            return new this.childClass(C(a, {titleGetter: this.groupTitleGetter,autoDestroyIfEmpty: this.collection ? !1 : this.autoDestroyEmptyGroups}))
        },behaviour: {childNodesModified: function(a, e) {
                this.nullGroup.nextSibling = this.firstChild;
                if (e.inserted && this.collection && this.nullGroup.firstChild)
                    for (var b = this.nullGroup.firstChild.parentNode, c = Array.from(this.nullGroup.childNodes), g = c.length - 1; g >= 0; g--)
                        b.insertBefore(c[g], c[g].nextSibling)
            }},init: function(a) {
            this.map_ = {};
            if (typeof a.autoDestroyEmptyGroups != "undefined")
                this.autoDestroyEmptyGroups = !!a.autoDestroyEmptyGroups;
            this.groupControlHolder = a.groupControlHolder;
            this.nullGroup = new c({autoDestroyIfEmpty: !1});
            this.inherit(a);
            return a
        },setTitleGetter: function(a) {
            this.groupTitleGetter = 
            f(a);
            for (a = this.firstChild; a; a = a.nextSibling)
                a.setTitleGetter(this.groupTitleGetter)
        },getGroupNode: function(a) {
            var a = this.groupGetter(a), e = a instanceof w, b = this.map_[e ? a.eventObjectId : a];
            !b && !this.collection && (b = this.appendChild({info: e ? a : {id: a,title: a}}));
            return b || this.nullGroup
        },insertBefore: function(a, e) {
            if (a = this.inherit(a, e)) {
                if ("groupId_" in a == !1)
                    a.groupId_ = a.delegate ? a.delegate.eventObjectId : a.info.id, this.map_[a.groupId_] = a;
                if (a.firstChild) {
                    var b = this.groupControlHolder, c = b.childNodes, g = 
                    a.firstChild, d = a.lastChild, j, f, m;
                    for (j = a.previousSibling; j; ) {
                        if (m = j.lastChild)
                            break;
                        j = j.previousSibling
                    }
                    if (!m)
                        m = this.nullGroup.lastChild;
                    for (j = a.nextSibling; j; ) {
                        if (f = j.firstChild)
                            break;
                        j = j.nextSibling
                    }
                    if (g.previousSibling != m || d.nextSibling != f) {
                        if (g.previousSibling)
                            g.previousSibling.nextSibling = d.nextSibling;
                        if (d.nextSibling)
                            d.nextSibling.previousSibling = g.previousSibling;
                        j = c.splice(c.indexOf(g), a.childNodes.length);
                        var l = c.indexOf(f);
                        j.unshift(l != -1 ? l : c.length, 0);
                        c.splice.apply(c, j);
                        g.previousSibling = 
                        m;
                        d.nextSibling = f;
                        if (m)
                            m.nextSibling = g;
                        if (f)
                            f.previousSibling = d;
                        b.firstChild = c[0];
                        b.lastChild = c[c.length - 1]
                    }
                }
                return a
            }
        },removeChild: function(a) {
            if (a = this.inherit(a))
                return delete this.map_[a.groupId_], a
        },clear: function() {
            this.map_ = {};
            this.inherit()
        },destroy: function() {
            this.inherit();
            delete this.map_
        }});
    z.prototype.groupControlClass = D;
    var o = {}, H = {destroy: function(a) {
            r.replace(a.element, this)
        }}, e = {update: function() {
            for (var a in this.satelliteConfig) {
                var e = this.satelliteConfig[a], b = typeof e.existsIf != 
                "function" || e.existsIf(this), c = this.satellite[a];
                if (b) {
                    var g = typeof e.delegate == "function" ? e.delegate(this) : null, d = typeof e.collection == "function" ? e.collection(this) : null, b = this.tmpl[e.replace || a];
                    c ? (c.setDelegate(g), c.setCollection(d)) : (c = {document: this.document,delegate: g,collection: d}, e.config && Object.complete(c, typeof e.config == "function" ? e.config(this) : e.config), c = new e.instanceOf(c), this.satellite[a] = c, c.owner = this, b && c instanceof x && c.element && (r.replace(b, c.element), c.addHandler(H, b)))
                } else
                    c && 
                    (c.destroy(), delete c.owner, delete this.satellite[a])
            }
        }}, x = k(p, {className: "Basis.DOM.Wrapper.HtmlNode",behaviour: {select: function() {
                (this.tmpl.selectedElement || this.tmpl.content || this.tmpl.element).className += " selected"
            },unselect: function() {
                var a = this.tmpl.selectedElement || this.tmpl.content || this.tmpl.element;
                a.className = a.className.replace(/(^|\s+)selected(\s+|$)/, "$2")
            },disable: function() {
                d(this.tmpl.disabledElement || this.tmpl.element).add("disabled")
            },enable: function() {
                d(this.tmpl.disabledElement || 
                this.tmpl.element).remove("disabled")
            },match: function() {
                r.display(this.tmpl.element, !0)
            },unmatch: function() {
                r.display(this.tmpl.element, !1)
            }},template: new v("<div{element|childNodesElement}></div>"),cssClassName: {},satelliteConfig: null,init: function(a) {
            if (a)
                if (typeof a != "object" || !isNaN(a.nodeType))
                    a = {content: a};
                else if (a.template)
                    this.template = a.template;
            if (this.template)
                this.template.createInstance(this.tmpl = {}), B(this, this.tmpl);
            var a = this.inherit(a), b = a.cssClassName;
            if (b) {
                typeof b == "string" && 
                (b = {element: b});
                for (var c in b) {
                    var g = this.tmpl[c];
                    g && (g = d(g), g.add.apply(g, String(b[c]).qw()))
                }
            }
            if (this.tmpl && this.tmpl.element && (this.tmpl.element.basisEventObjectId = this.eventObjectId, o[this.eventObjectId] = this, a.id))
                this.tmpl.element.id = a.id;
            if (this.satelliteConfig)
                this.satellite = {}, this.addHandler(e), e.update.call(this, this, {});
            a.content && r.insert(this.tmpl.content || this.tmpl.element, a.content);
            a.container && r.insert(a.container, this.tmpl.element);
            return a
        },addEventListener: function(a, e, b) {
            e = 
            e || a;
            s.addHandler(this.tmpl.element, a, function(a) {
                var c = this.getNodeByEventSender(a);
                c && c.dispatch(e, a);
                this.dispatch(e, a, c);
                !b && s.sender(a).tagName != "INPUT" && s.kill(a)
            }, this)
        },getNodeByEventSender: function(a) {
            a = s.sender(a);
            if (a = a.basisEventObjectId ? a : r.parent(a, f("basisEventObjectId"), 0, this.tmpl.element))
                if ((a = o[a.basisEventObjectId]) && a.document == this)
                    return a
        },destroy: function() {
            delete o[this.eventObjectId];
            if (this.satellite) {
                for (var a in this.satellite) {
                    var e = this.satellite[a];
                    e.destroy();
                    delete e.owner
                }
                delete this.satellite
            }
            this.inherit();
            if (a = this.element)
                s.clearHandlers(a), a.parentNode && a.parentNode.removeChild(a);
            this.template ? (this.template.clearInstance(this), delete this.tmpl) : (delete this.element, delete this.content, delete this.childNodesElement)
        }}), J = k(x, {className: "Basis.DOM.Wrapper.HtmlContainer",groupControlClass: K,childClass: x,childFactory: function(a) {
            return new this.childClass(a)
        },insertBefore: function(a, e) {
            if (a = this.inherit(a, e)) {
                if (this === a.parentNode) {
                    var b = a.groupNode, c = null;
                    if (!b || !b.childNodesElement)
                        b = this;
                    if (a != 
                    b.lastChild)
                        c = a.nextSibling.element;
                    for (; c && c.parentNode != b.childNodesElement; )
                        c = c.parentNode;
                    (a.element.parentNode !== b.childNodesElement || a.element.nextSibling !== c) && b.childNodesElement.insertBefore(a.element, c)
                }
                return a
            }
        },removeChild: function(a) {
            if (this.inherit(a)) {
                var e = a.element, b = e.parentNode;
                b && b.removeChild(e);
                return a
            }
        },clear: function(a) {
            if (a)
                for (var e = this.firstChild; e; )
                    e.element.parentNode && e.element.parentNode.removeChild(e.element), e = e.nextSibling;
            this.inherit(a)
        },setChildNodes: function(a, 
        e) {
            var b = r.createFragment(), c = this.groupControl || this, g = c.childNodesElement;
            c.childNodesElement = b;
            this.inherit(a, e);
            g.appendChild(b);
            c.childNodesElement = g;
            return this.childNodes
        }}), v = k(c, J).extend({className: "Basis.DOM.Wrapper.HtmlPartitionNode",template: new v('<div{element} class="Basis-PartitionNode"><div class="Basis-PartitionNode-Title">{titleText}</div><div{content|childNodesElement} class="Basis-PartitionNode-Content"></div></div>'),behaviour: t(c, t(J, {update: function(a, e) {
                this.inherit(a, e);
                if (this.tmpl.titleText)
                    this.tmpl.titleText.nodeValue = Object.coalesce(this.titleGetter(this), "")
            }})),clear: c.prototype.clear}), K = k(D, J).extend({className: "Basis.DOM.Wrapper.HtmlGroupControl",behaviour: D.prototype.behaviour,template: null,childClass: v,childFactory: D.prototype.childFactory,init: function(a) {
            a = this.inherit(a);
            if (this.groupControlHolder)
                this.tmpl = this.tmpl || {}, this.childNodesElement = this.groupControlHolder.tmpl.groupsElement || this.groupControlHolder.childNodesElement, this.document = this.groupControlHolder;
            return a
        },clear: function(a) {
            for (var e = Array.from(this.childNodes); e.length; ) {
                var b = e.pop();
                b.clear(a);
                b.destroy()
            }
        },destroy: function() {
            this.inherit();
            delete this.groupControlHolder;
            delete this.childNodesElement
        }});
    J.prototype.groupControlClass = K;
    var t = k(J, {className: "Basis.DOM.Wrapper.Control",childClass: null,childFactory: function(a) {
            return new this.childClass(a)
        },init: function(a) {
            a = B({}, a);
            if ("selection" in a == !1)
                a.selection = {};
            if (a.selection instanceof N == !1)
                a.selection = new N(a.selection instanceof 
                Object ? a.selection : null);
            this.document = this;
            a = this.inherit(a);
            A.add(this);
            return a
        },select: function() {
        },unselect: function() {
            this.selection && this.selection.clear()
        },disable: function() {
            if (!this.disabled)
                this.disabled = !0, this.dispatch("disable")
        },destroy: function() {
            this.selection && (this.selection.destroy(), delete this.selection);
            this.inherit();
            A.remove(this)
        }}), L = {childNodesModified: function(a, e) {
            var b = {}, c = 0, g = 0, d = e.inserted, j = e.deleted;
            if (d && d.length)
                for (b.inserted = d; a = d[c]; )
                    this.map_[a.eventObjectId] = 
                    a, c++;
            if (j && j.length)
                for (b.deleted = j; a = j[g]; )
                    delete this.map_[a.eventObjectId], g++;
            if (c || g)
                this.itemCount += c - g, this.version++, this.dispatch("datasetChanged", this, b)
        },destroy: function() {
            this.autoDestroy ? this.destroy() : this.setSourceNode()
        }}, I = k(j, {className: "Basis.DOM.Wrapper.ChildNodesDataset",autoDestroy: !0,behaviour: {sourceNodeChanged: function() {
                !this.sourceNode && this.autoDestroy && this.destroy()
            }},init: function(a, e) {
            this.inherit(e);
            this.setSourceNode(a)
        },setSourceNode: function(a) {
            if (a !== this.sourceNode) {
                var e = 
                this.sourceNode;
                e && (e.removeHandler(L, this), L.childNodesModified.call(this, e, {deleted: e.childNodes}), delete this.sourceNode);
                if (a instanceof z)
                    this.sourceNode = a, a.addHandler(L, this), L.childNodesModified.call(this, a, {inserted: a.childNodes});
                this.dispatch("sourceNodeChanged", this, e)
            }
            return this.sourceNode
        },destroy: function() {
            this.sourceNode && (this.sourceNode.removeHandler(L, this), delete this.sourceNode);
            this.inherit()
        }}), N = k(y, {className: "Basis.DOM.Wrapper.Selection",multiple: !1,behaviour: {datasetChanged: function(a, 
            e) {
                this.inherit(a, e);
                if (e.inserted)
                    for (var b = 0, c; c = e.inserted[b]; b++)
                        if (!c.selected)
                            c.selected = !0, c.dispatch("select");
                if (e.deleted)
                    for (b = 0; c = e.deleted[b]; b++)
                        if (c.selected)
                            c.selected = !1, c.dispatch("unselect");
                this.dispatch("change")
            }},init: function(a) {
            this.inherit(a);
            if (a && a.multiple)
                this.multiple = !!a.multiple
        },add: function(a) {
            if (!this.multiple)
                if (this.itemCount)
                    return this.set(a);
                else
                    a.splice(1);
            for (var e = [], b = 0, c; c = a[b]; b++)
                c.controlSelection == this && c.selectable && e.push(c);
            return this.inherit(e)
        },
        set: function(a) {
            this.multiple || a.splice(1);
            for (var e = [], b = 0, c; c = a[b]; b++)
                c.controlSelection == this && c.selectable && e.push(c);
            return this.inherit(e)
        },pick: function() {
            for (var a in this.map_)
                return this.member_[a]
        }});
    Basis.namespace("Basis.DOM.Wrapper").extend({HierarchyTools: a,AbstractNode: z,InteractiveNode: g,Node: p,ChildNodesDataset: I,Selection: N,GroupControl: D,PartitionNode: c,Control: t,HtmlGroupControl: K,HtmlPartitionNode: v,HtmlNode: x,HtmlContainer: J,HtmlControl: t})
})();
(function() {
    function n(a) {
        j[a] = j[a] || 0;
        return a + j[a]++
    }
    var h = Basis.Class, i = Object.extend, k = Array.from, r = Function.$self, s = Function.getter, v = Basis.Data, w = Basis.EventObject, t = v.Dataset, A = v.Collection, u = v.Grouping, f = v.DataObject, d = v.STATE, B = {string: 1,number: 1}, C = [], y = function(a) {
        return isNaN(a) ? null : Number(a)
    }, b = function(a) {
        return isNaN(a) ? null : parseInt(a)
    }, l = function(a) {
        return a == null ? null : String(a)
    }, j = {}, v = function(a) {
        return this.inherit(a && a.map(this.wrapper))
    }, z = function(a) {
        return function(e) {
            if (e) {
                if (this.name = 
                e.name || n(a), e.wrapper)
                    this.wrapper = e.wrapper
            } else
                this.name = n(a);
            this.inherit(e)
        }
    }, c = function(a, e) {
        t.setAccumulateState(!0);
        a = (a || []).map(this.wrapper);
        t.setAccumulateState(!1);
        return this.inherit(a, e)
    }, g = h(t, {className: "Basis.Entity.EntitySet",wrapper: Function.$self,init: z("EntitySet"),sync: c,set: v,add: v,remove: v,destroy: function() {
            this.inherit();
            delete this.wrapper
        }}), m = h(g, {className: "Basis.Entity.ReadOnlyEntitySet",set: Function.$false,add: Function.$false,remove: Function.$false,clear: Function.$false}), 
    a = h(A, {className: "Basis.Entity.EntityCollection",init: z("EntityCollection"),sync: c}), p = h(u, {className: "Basis.Entity.EntityGrouping",groupClass: m,init: z("EntityGrouping"),sync: c,getGroup: function(a, e) {
            var b = this.inherit(a, e);
            if (b)
                b.wrapper = this.wrapper;
            return b
        }}), D = function(a) {
        if (this instanceof D) {
            var e = new o(a || r);
            return function(a, b) {
                return a != null ? (b instanceof g || (b = e.createEntitySet()), b.set(a instanceof t ? a.getItems() : Array.from(a)), b) : null
            }
        }
    };
    D.className = "Basis.Entity.EntitySetWrapper";
    var o = 
    h(null, {className: "Basis.Entity.EntitySetConstructor",init: function(a) {
            this.wrapper = a
        },createEntitySet: function() {
            return new g({wrapper: this.wrapper,name: "Set of " + ((this.wrapper.entityType || this.wrapper).name || "").quote("{")})
        }}), H = function(e) {
        if (this instanceof H) {
            var b = function(a, e) {
                if (a != null) {
                    if (a === e || a.entityType === c)
                        return a;
                    var b, d = c.idField;
                    if (B[typeof a]) {
                        if (!d)
                            return;
                        b = a;
                        a = {};
                        a[d] = b
                    } else if (d)
                        b = a[d];
                    else if (g && (e = c.singleton, !e))
                        return c.singleton = new c.entityClass(a);
                    b != null && (e = c.index_[b]);
                    e && e.entityType === c ? e.update(a) : e = new c.entityClass(a);
                    return e
                } else
                    return c.singleton
            }, c = new J(e || {}, b), g = c.isSingleton;
            i(b, {entityType: c,get: function(a) {
                    return c.get(a)
                },getAll: function() {
                    return k(c.all.getItems())
                },addField: function(a, e) {
                    c.addField(a, e)
                },all: c.all,createCollection: function(e, g, d) {
                    var j = c.collection_[e];
                    return !j && g ? c.collection_[e] = new a({wrapper: b,sources: [d || c.all],filter: g}) : j
                },getCollection: function(a) {
                    return c.collection_[a]
                },createGrouping: function(a, e, g) {
                    var d = c.grouping_[a];
                    return !d && e ? c.grouping_[a] = new p({wrapper: b,sources: [g || c.all],groupGetter: e}) : d
                },getGrouping: function(a) {
                    return c.grouping_[a]
                },getSlot: function(a) {
                    return c.getSlot(a)
                }});
            return b
        }
    };
    H.className = "Basis.Entity.EntityTypeWrapper";
    var e = s("singleton"), x = {}, J = h(null, {className: "Basis.Entity.EntityType",name: "UntitledEntityType",defaults: null,fields: null,extensible: !1,index_: null,slot_: null,init: function(c, g) {
            this.name = c.name || n(this.name);
            C.push(this);
            this.isSingleton = c.isSingleton;
            this.wrapper = g;
            this.all = 
            new m({wrapper: g});
            this.index_ = {};
            this.slot_ = {};
            if (c.extensible)
                this.extensible = !0;
            this.fields = {};
            this.defaults = {};
            if (c.fields)
                for (var d in c.fields) {
                    var j = c.fields[d];
                    this.addField(d, j);
                    if ([y, b, l].has(j))
                        c.id = d
                }
            if (this.isSingleton)
                this.get = e;
            else {
                var x = this.idField = c.id || null;
                this.idFieldNames = [];
                if (x) {
                    this.idFieldNames.push(x);
                    var o = this.fields[this.idField], i = function(a) {
                        if (a) {
                            if (a instanceof f)
                                a = a.info;
                            return a[x]
                        }
                    };
                    this.getId = i;
                    this.get = function(a) {
                        return this.index_[B[typeof a] ? o(a) : i(a)]
                    }
                }
            }
            this.aliases = 
            {};
            c.aliases && Object.iterate(c.aliases, function(a, e) {
                this.aliases[a] = e;
                e == this.idField && this.idFieldNames.push(a)
            }, this);
            this.collection_ = {};
            if (c.collections)
                for (var z in c.collections)
                    this.collection_[z] = new a({name: z,wrapper: g,sources: [this.all],filter: c.collections[z] || Function.$true});
            this.grouping_ = {};
            if (c.groupings)
                for (z in c.groupings)
                    this.grouping_[z] = new p({name: z,wrapper: g,sources: [this.all],groupGetter: c.groupings[z] || Function.$true});
            this.reflection_ = {};
            if (c.reflections)
                for (z in c.reflections)
                    this.addReflection(z, 
                    c.reflections[z]);
            this.entityClass = h(K, {className: "Basis.Entity",entityType: this,defaults: this.defaults,all: this.all,getId: x ? function() {
                    return this.info[x]
                } : Function.$null})
        },addField: function(a, e) {
            this.all.length || (typeof e == "function" ? (this.fields[a] = e, this.defaults[a] = this.fields[a]()) : (this.fields[a] = r, this.defaults[a] = this.defaults[a]), x[a] || (x[a] = {destroy: function() {
                    this.set(a, null)
                }}))
        },addReflection: function(a, e) {
            var b = new L(a, e);
            this.reflection_[a] = b;
            for (var c = this.all.getItems(), g = c.length; --g >= 
            0; )
                b.update(c[g])
        },get: Function.$null,getId: function(a) {
            if (a && this.idField) {
                var e = a;
                if (a instanceof f)
                    e = e.info;
                for (var a = 0, b; b = this.idFieldNames[a]; a++)
                    if (b in e)
                        return e[b]
            }
        },getSlot: function(a, e) {
            var b = this.slot_[a];
            b || (e = i({}, e), e[this.idField] = a, b = this.slot_[a] = new f({defaults: e,delegate: this.index_[a]}));
            return b
        }}), K = h(f, {className: "Basis.Entity.Entity",canHaveDelegate: !1,modified: null,silentSet_: !1,behaviour: {update: function(a, e) {
                this.inherit(a, e);
                for (var b in this.entityType.reflection_)
                    this.entityType.reflection_[b].update(this)
            },
            destroy: function() {
                this.inherit();
                for (var a in this.reflection_)
                    this.entityType.reflection_[a].detach(this)
            }},init: function(a) {
            var e = this.entityType;
            this.inherit();
            this.fieldHandlers_ = {};
            this.value = this.info = {};
            var b = e.defaults, c = e.fields, g = e.aliases, d = {}, j, f;
            for (f in a)
                d[g[f] || f] = a[f];
            for (f in c) {
                a = f in d ? c[f](d[f]) : b[f];
                if (f == e.idField) {
                    if (a != null) {
                        if (e.index_[a])
                            continue;
                        e.index_[a] = this;
                        j = e.slot_[a]
                    }
                } else
                    a && a !== this && a instanceof w && a.addHandler(x[f], this) && (this.fieldHandlers_[f] = !0);
                this.info[f] = 
                a
            }
            j && j.setDelegate(this);
            this.all.dispatch("datasetChanged", this.all, {inserted: [this]});
            this.reflection_ = {};
            for (var m in e.reflection_)
                e.reflection_[m].update(this)
        },toString: function() {
            return "[object " + this.constructor.className + "(" + this.entityType.name + ")]"
        },get: function(a) {
            if (this.info)
                return this.info[this.entityType.aliases[a] || a]
        },set: function(a, e, b) {
            var c = this.entityType, a = c.aliases[a] || a, g = c.fields[a];
            if (!g) {
                if (!c.extensible)
                    return;
                g = r
            }
            var d, j = {}, g = g(e, this.info[a]), e = this.info[a];
            if (g !== 
            e && (!g || !e || g.constructor !== Date || e.constructor !== Date || Number(g) !== Number(e))) {
                if (c.idField == a) {
                    b = c.index_;
                    c = c.slot_;
                    if (b[g])
                        return !1;
                    e != null && (delete b[e], c[e] && c[e].setDelegate());
                    g != null && (b[g] = this, c[g] && c[g].setDelegate(this))
                } else if (b) {
                    if (!this.modified)
                        this.modified = {};
                    if (a in this.modified === !1)
                        j.rollback = {key: a,value: void 0}, this.modified[a] = e, d = "ROLLBACK_AND_INFO";
                    else if (this.modified[a] === g)
                        j.rollback = {key: a,value: g}, delete this.modified[a], Object.keys(this.modified).length || delete this.modified
                } else if (this.modified && 
                a in this.modified)
                    if (this.modified[a] !== g)
                        j.rollback = {key: a,value: this.modified[a]}, this.modified[a] = g, d = "ROLLBACK_ONLY";
                    else
                        return !1;
                if (d != "ROLLBACK_ONLY")
                    this.info[a] = g, this.fieldHandlers_[a] && (e.removeHandler(x[a], this), delete this.fieldHandlers_[a]), g && g !== this && g instanceof w && g.addHandler(x[a], this) && (this.fieldHandlers_[a] = !0), j.key = a, j.value = e
            } else if (!b && this.modified && a in this.modified)
                j.rollback = {key: a,value: this.modified[a]}, delete this.modified[a], Object.keys(this.modified).length || 
                delete this.modified;
            if (!this.silentSet_ && (j.key && (d = {}, d[a] = e, this.dispatch("update", this, d)), j.rollback))
                a = {}, a[j.rollback.key] = j.rollback.value, this.dispatch("rollbackUpdate", this, a);
            return j || !1
        },update: function(a, e) {
            if (a) {
                var b, c = {}, g, d = {}, j;
                this.silentSet_ = !0;
                for (var f in a)
                    if (j = this.set(f, a[f], e)) {
                        if (j.key)
                            b = !0, c[j.key] = j.value;
                        if (j.rollback)
                            g = !0, d[j.rollback.key] = j.rollback.value
                    }
                this.silentSet_ = !1;
                b && this.dispatch("update", this, c);
                g && this.dispatch("rollbackUpdate", this, d)
            }
            return b ? c : !1
        },
        reset: function() {
            this.update(this.entityType.defaults)
        },clear: function() {
            var a = {}, e;
            for (e in this.info)
                a[e] = void 0;
            return this.update(a)
        },commit: function(a) {
            if (this.modified) {
                var e = this.modified;
                delete this.modified
            }
            this.update(a);
            e && this.dispatch("rollbackUpdate", this, e)
        },rollback: function() {
            if (this.state != d.PROCESSING) {
                if (this.modified) {
                    var a = this.modified;
                    delete this.modified;
                    this.update(a);
                    this.dispatch("rollbackUpdate", this, a)
                }
                this.setState(d.READY)
            }
        },destroy: function() {
            var a = this.entityType, 
            e;
            for (e in this.fieldHandlers_)
                this.info[e].removeHandler(x[e], this);
            delete this.fieldHandlers_;
            e = this.info[a.idField];
            a.index_[e] === this && (delete a.index_[e], a.slot_[e] && a.slot_[e].setDelegate());
            this.inherit();
            this.all.dispatch("datasetChanged", this.all, {deleted: [this]});
            this.value = this.info = {};
            delete this.modified
        }}), L = h(null, {className: "Basis.Entity.Reflection",init: function(a, e) {
            this.name = a;
            this.keepReflectionAlive = e.keepReflectionAlive === !0;
            this.dataGetter = e.dataGetter || r;
            this.destroyDataGetter = 
            e.destroyDataGetter || null;
            this.entityType = e.entityType || r;
            this.isExists = e.isExists || function(a) {
                return !!Object.keys(a).length
            }
        },update: function(a) {
            this.isExists(a.info, a) ? this.attach(a, this.name) : this.detach(a, this.name)
        },attach: function(a) {
            var e = a.reflection_[this.name], b = this.dataGetter(a.info, a);
            e ? e instanceof f ? e.update(b) : i(e, b) : a.reflection_[this.name] = this.entityType(b)
        },detach: function(a) {
            var e = a.reflection_[this.name];
            if (e) {
                if (this.keepReflectionAlive) {
                    if (this.destroyDataGetter) {
                        var b = this.destroyDataGetter(a.info, 
                        a);
                        e instanceof f ? e.update(b) : i(e, b)
                    }
                } else
                    typeof e.destroy == "function" && e.destroy();
                delete a.reflection_[this.name]
            }
        },destroy: function() {
        }});
    Basis.namespace("Basis.Entity").extend({isEntity: function(a) {
            return a && a instanceof K
        },NumericId: y,IntId: b,StringId: l,EntityType: H,Entity: K,EntitySetType: D,EntitySet: g,ReadOnlyEntitySet: m,Collection: a,Grouping: p})
})();
(function() {
    function n(f, d) {
        return f << d | f >>> 32 - d
    }
    function h(f) {
        var d = [];
        do
            d.push((f & 15).toString(16)), f >>= 4;
        while (f);
        d.length & 1 && d.push("0");
        return d.reverse().join("")
    }
    function i(f) {
        if (typeof f == "number")
            return h(f);
        var d = [], d = Array.isArray(f) ? f.map(i) : String(f).toArray().map(function(d) {
            return h(d.charCodeAt(0))
        });
        return d.join("")
    }
    Basis.namespace("Basis.Crypt", function(f) {
        A = f || "";
        return u
    });
    var k = Array.create(255, function(f) {
        return String.fromCharCode(f)
    }), r = function() {
        function f(d) {
            for (var f = 
            "", h = d.length, b = 0; b < h; b++) {
                var l = d.charCodeAt(b);
                f += l < 128 ? k[l] : l < 2048 ? k[l >> 6 | 192] + k[l & 63 | 128] : k[l >> 12 | 224] + k[l >> 6 & 63 | 128] + k[l & 63 | 128]
            }
            return f
        }
        function d(d) {
            for (var f = "", h = d.length, b, l, j, i = 0; i < h; )
                b = d.charCodeAt(i++), b < 128 ? f += k[b] : (l = d.charCodeAt(i++), b & 32 ? (j = d.charCodeAt(i++), f += String.fromCharCode((b & 15) << 12 | (l & 63) << 6 | j & 63)) : f += String.fromCharCode((b & 31) << 6 | l & 63));
            return f
        }
        return Basis.namespace("Basis.Crypt.UTF16").extend({toBytes: function(d) {
                for (var f = [], h = d.length, b = 0; b < h; b++) {
                    var l = d.charCodeAt(b);
                    f.push(l & 255, l >> 8)
                }
                return f
            },fromBytes: function(d) {
                for (var f = "", h = d.length, b, l, j = 0; j < h; )
                    b = d[j++] || 0, l = d[j++] || 0, f += String.fromCharCode(l << 8 | b);
                return f
            },toUTF8: f,fromUTF8: d,toUTF8Bytes: function(d) {
                return s.toBytes(f(d))
            },fromUTF8Bytes: function(f) {
                return d(s.fromBytes(f))
            }})
    }(), s = function() {
        return Basis.namespace("Basis.Crypt.UTF8").extend({toBytes: function(f) {
                for (var d = f.length, h = Array(d), i = 0; i < d; i++)
                    h[i] = f.charCodeAt(i);
                return h
            },fromBytes: function(f) {
                for (var d = f.length, h = "", i = 0; i < d; i++)
                    h += k[f[i]];
                return h
            },toUTF16: function(f) {
                return r.fromUTF8(f)
            },fromUTF16: function(f) {
                return r.toUTF8(f)
            },toUTF16Bytes: function(f) {
                return r.toBytes(r.fromUTF8(f))
            },fromUTF16Bytes: function(f) {
                return r.toUTF8(r.fromBytes(f))
            }})
    }(), v = function() {
        var f = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".toArray(), d = {};
        f.forEach(function(f, h) {
            d[f] = h
        });
        return Basis.namespace("Basis.Crypt.Base64").extend({encode: function(d, h) {
                d.constructor != Array && (d = h ? r.toUTF8Bytes(d) : r.toBytes(d));
                for (var i = d.length, 
                b = 0, l = "", j, z, c, g, m, a; b < i; )
                    j = d[b++], z = d[b++], c = d[b++], g = j >> 2, j = (j & 3) << 4 | z >> 4, m = (z & 15) << 2 | c >> 6, a = c & 63, z == void 0 ? m = a = 64 : c == void 0 && (a = 64), l += f[g] + f[j] + f[m] + f[a];
                return l
            },decode: function(f, h) {
                for (var i = [], b, l, j, z, c, g = 0, f = f.replace(/[^a-z0-9\+\/]/ig, ""), m = f.length; g < m; )
                    b = d[f.charAt(g++)], l = d[f.charAt(g++)], z = d[f.charAt(g++)], c = d[f.charAt(g++)], b = b << 2 | l >> 4, l = (l & 15) << 4 | z >> 2, j = (z & 3) << 6 | c, i.push(b, l, j);
                (z == null || z == 64) && i.pop();
                (c == null || c == 64) && i.pop();
                return h ? r.fromUTF8Bytes(i) : r.fromBytes(i)
            }})
    }(), w = 
    function() {
        function f(d) {
            for (var f = [], b = 3; b >= 0; b--)
                f.push(d >> b * 8 & 255);
            return f
        }
        var d = [1518500249, 1859775393, 2400959708, 3395469782], h = [function(d, f, b) {
                return b ^ d & (f ^ b)
            }, function(d, f, b) {
                return d ^ f ^ b
            }, function(d, f, b) {
                return d & f | b & (d | f)
            }, function(d, f, b) {
                return f ^ d ^ b
            }];
        return function(i, k) {
            i.constructor != Array && (i = k ? r.toUTF8Bytes(i) : r.toBytes(i));
            for (var b = i.length, l = [], j = 0; j < b; j++)
                l[j >> 2] |= i[j] << (3 - (j & 3) << 3);
            b & 3 ? l[b >> 2] |= Math.pow(2, (4 - (b & 3) << 3) - 1) : l[b >> 2] = 2147483648;
            l.push.apply(l, Array.create(((l.length & 
            15) > 14 ? 30 : 14) - (l.length & 15), 0));
            l.push(b >>> 29);
            l.push(b << 3 & 4294967295);
            l.reverse();
            for (var b = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], z = b.clone(), c, g = l.length >> 4, m = Array(80); g--; ) {
                for (j = 0; j < 16; j++)
                    m[j] = l.pop();
                for (j = 16; j < 80; j++)
                    m[j] = n(m[j - 3] ^ m[j - 8] ^ m[j - 14] ^ m[j - 16], 1);
                for (j = 0; j < 80; j++)
                    c = Math.floor(j / 20), b[4] = n(b[0], 5) + h[c](b[1], b[2], b[3]) + b[4] + m[j] + d[c] & 4294967295, b[1] = n(b[1], 30), b.unshift(b.pop());
                for (j = 0; j < 5; j++)
                    b[j] = z[j] = b[j] + z[j] & 4294967295
            }
            return b.map(f).flatten()
        }
    }(), t = function() {
        function f(b) {
            for (var d = 
            arguments, c = d.length, g = b & 65535, f = b >> 16, a = 1; a < c; a++) {
                var l = d[a];
                g += l & 65535;
                f += (l >> 16) + (g >> 16);
                g &= 65535
            }
            return f << 16 | g & 65535
        }
        function d(b) {
            for (var d = [], c = 0; c < 4; c++)
                d.push(b >> c * 8 & 255);
            return d
        }
        var h = Math.pow(2, 32), i, k = [], b = [], l = [function(b, d, c) {
                return c ^ b & (d ^ c)
            }, function(b, d, c) {
                return d ^ c & (d ^ b)
            }, function(b, d, c) {
                return b ^ d ^ c
            }, function(b, d, c) {
                return d ^ (b | ~c)
            }];
        return function(j, z) {
            if (!i) {
                i = [[7, 12, 17, 22].repeat(4), [5, 9, 14, 20].repeat(4), [4, 11, 16, 23].repeat(4), [6, 10, 15, 21].repeat(4)].flatten();
                for (var c = 
                0; c < 64; c++)
                    switch (k[c] = Math.floor(Math.abs(Math.sin(c + 1)) * h), c >> 4) {
                        case 0:
                            b[c] = c;
                            break;
                        case 1:
                            b[c] = c * 5 + 1 & 15;
                            break;
                        case 2:
                            b[c] = c * 3 + 5 & 15;
                            break;
                        case 3:
                            b[c] = c * 7 & 15
                    }
            }
            j.constructor != Array && (j = z ? r.toUTF8Bytes(j) : r.toBytes(j));
            for (var c = [], g = j.length, m = 0; m < g; m++)
                c[m >> 2] |= j[m] << ((m & 3) << 3);
            c[g >> 2] |= 128 << ((g & 3) << 3);
            c.push.apply(c, Array(((c.length & 15) > 14 ? 30 : 14) - (c.length & 15)));
            c.push(g << 3 & 4294967295);
            c.push(g >>> 29);
            for (var g = [1732584193, 4023233417, 2562383102, 271733878], a = g.clone(), p = c.length >> 4; p--; ) {
                for (m = 0; m < 
                64; m++)
                    g[0] = f(n(f(g[0], l[m >> 4](g[1], g[2], g[3]), c[b[m]], k[m]), i[m]), g[1]), g.unshift(g.pop());
                for (m = 0; m < 4; m++)
                    g[m] = a[m] = f(g[m], a[m])
            }
            return g.map(d).flatten()
        }
    }(), A = "", u = {};
    Object.iterate({sha1: function(f) {
            return w(this, f)
        },sha1hex: function(f) {
            return i(w(this, f))
        },md5: function(f) {
            return t(this, f)
        },md5hex: function(f) {
            return i(t(this, f))
        },base64: function(f) {
            return v.encode(this, f)
        },base64decode: function(f) {
            return v.encode(this, f)
        },hex: function() {
            return i(this)
        }}, function(f, d) {
        u[f] = function(f) {
            f = d.call(A, 
            f);
            return A = Object.extend(typeof f != "object" ? Object(f) : f, u)
        }
    });
    Basis.namespace("Basis.Crypt").extend({HEX: i,SHA1: w,MD5: t})
})();
(function() {
    function n(b, d) {
        var f = {"JS-Framework": "Basis"};
        u.test(d.method) ? (f["Content-type"] = d.contentType + (d.encoding ? ";charset=" + d.encoding : ""), s.test("gecko") && (f.Connection = "close")) : s.test("ie") && (f["If-Modified-Since"] = (new Date(0)).toGMTString());
        Object.iterate(Object.complete(f, d.headers), function(b, c) {
            c != null && this.setRequestHeader(b, c)
        }, b)
    }
    function h(b) {
        var d = this.transport;
        if (d) {
            if (typeof b != "number")
                b = d.readyState;
            if (b != this.prevReadyState_)
                if (this.prevReadyState_ = b, this.dispatch("readyStateChanged", 
                b), b == 4) {
                    w.remove(this, "timeoutAbort");
                    var b = A.UNDEFINED, f;
                    this.progress = !1;
                    d.onreadystatechange = Function.$undef;
                    if (this.aborted) {
                        var h = this.abortedByTimeout_;
                        h && this.dispatch("timeout");
                        this.dispatch("abort", h)
                    } else
                        b = this.responseIsSuccess(), this.update({text: d.responseText,xml: d.responseXML}), b ? (this.dispatch("success", d), b = A.READY) : (this.dispatch("failure", d), b = A.ERROR, f = this.getRequestError(d));
                    this.dispatch("complete", d);
                    this.setState(b, f)
                } else
                    this.setState(A.PROCESSING)
        }
    }
    function i(b) {
        w.remove(this, 
        "timeoutAbort");
        this.abortedByTimeout_ = this.aborted = this.progress = !1;
        this.prevReadyState_ = -1;
        if (s.test("gecko1.8.1-") && b.asynchronous)
            this.transport = B();
        var d = this.transport;
        this.asynchronous ? d.onreadystatechange = h.bind(this) : h.call(this, 0);
        d.open(b.method, b.location, b.asynchronous);
        this.progress = !0;
        this.abortedByTimeout_ = this.aborted = !1;
        n(d, b);
        this.dispatch("start");
        if (this.aborted)
            h.call(this, 4);
        else if (!this.aborted && this.progress) {
            this.requestStartTime = Date.now();
            w.add(this, "timeoutAbort", this.requestStartTime + 
            this.timeout);
            var f = b.postBody;
            if (b.method == "POST" && s.test("ie9-"))
                if (typeof f == "object" && typeof f.documentElement != "undefined" && typeof f.xml == "string")
                    f = f.xml;
                else if (typeof f == "string")
                    f = f.replace(/\r/g, "");
                else if (f == null || f == "")
                    f = "[empty request]";
            d.send(f);
            return !0
        }
    }
    var k = Basis.Class, r = Basis.Event, s = Basis.Browser, v = Basis.Cleaner, w = Basis.TimeEventManager, t = Basis.Data, A = t.STATE, u = /POST/i, f = s.Cookies.get("DEBUG_AJAX");
    (function() {
        for (var b = 192; b <= 255; b++)
            b.toHex(), String.fromCharCode(b + 848), (b + 
            848).toHex(), b.toHex()
    })();
    var d = "native", B = function() {
        if (window.XMLHttpRequest)
            return function() {
                return new XMLHttpRequest
            };
        var b = window.ActiveXObject;
        if (b)
            for (var f = ["MSXML2.XMLHTTP.6.0", "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"], j = 0; d = f[j]; j++)
                try {
                    if (new b(d))
                        return function() {
                            return new b(d)
                        }
                } catch (h) {
                }
        throw Error(d = "Browser doesn't support for XMLHttpRequest!");
    }(), C = [], y = function() {
        var b = [{handler: {start: function() {
                        C.add(this)
                    },complete: function() {
                        C.remove(this)
                    }}}];
        r.onUnload(function() {
            b.clear()
        });
        return {addHandler: function(d, f) {
                for (var h = 0, c; c = b[h]; h++)
                    if (c.handler === d && c.thisObject === f)
                        return !1;
                b.push({handler: d,thisObject: f});
                return !0
            },removeHandler: function(d, f) {
                for (var h = 0, c; c = b[h]; h++)
                    if (c.handler === d && c.thisObject === f)
                        return b.splice(h, 1), !0;
                return !1
            },dispatch: function(d) {
                if (b.length)
                    for (var f = Array.prototype.slice.call(arguments, 1), h, c, g = b.length - 1; h = b[g]; g--)
                        c = h.handler[d], typeof c == "function" && c.apply(h.thisObject || this, f)
            },abort: function() {
                for (var b = Array.from(C), d = 0; d < b.length; d++)
                    b[d].abort();
                return b
            }}
    }(), k = k(t.DataObject, {className: "Basis.Ajax.Transport",state: A.UNDEFINED,behaviour: {stateChanged: function(b, d) {
                this.inherit(b, d);
                for (var f = 0; f < this.influence.length; f++)
                    this.influence[f].setState(this.state, this.state.data)
            }},influence: [],debug: f,progress: !1,aborted: !1,abortedByTimeout_: !1,abortCalled: !1,timeout: 3E4,requestStartTime: 0,requestData_: null,asynchronous: !0,method: "GET",contentType: "application/x-www-form-urlencoded",encoding: null,init: function(b, d, f) {
            var b = typeof b != "object" || 
            b == null ? {url: b} : b, h = b.url;
            if (b.callback)
                b.handlers = b.callback;
            this.transport = B();
            this.requestHeaders = {};
            this.influence = [];
            this.url = h;
            this.params = {};
            if (f || b.method)
                this.method = f || b.method;
            if (d != null && !d)
                this.asynchronous = !1;
            if (typeof b.asynchronous == "boolean")
                this.asynchronous = b.asynchronous;
            b.influence && this.setInfluence(b.influence);
            v.add(this);
            return this.inherit(b)
        },setInfluence: function() {
            for (var b = Array.from(arguments), d = 0; d < b.length; d++)
                b[d].setState(this.state, this.state.data);
            this.influence.set(b)
        },
        clearInfluence: function() {
            this.influence.clear()
        },setParam: function(b, d) {
            this.params[b] = d
        },setParams: function(b) {
            this.clearParams();
            for (var d in b)
                this.setParam(d, b[d])
        },removeParam: function(b) {
            delete this.params[b]
        },clearParams: function() {
            for (var b in this.params)
                delete this.params[b]
        },dispatch: function(b) {
            y.dispatch.apply(this, arguments);
            this.inherit.apply(this, arguments)
        },timeoutAbort: function() {
            this.abortedByTimeout_ = !0;
            this.abort()
        },abort: function() {
            this.aborted = !0;
            if (this.progress)
                w.remove(this, 
                "timeoutAbort"), this.progress = !1, this.transport.abort(), this.asynchronous && this.transport.onreadystatechange && this.transport.onreadystatechange !== Function.$undef && h.call(this, 4)
        },request: function(b) {
            var b = b || this.url, d = this.method.toUpperCase(), f, h;
            if (!this.transport)
                throw Error("Transport is not allowed");
            if (!b)
                throw Error("URL is not defined");
            this.abort();
            delete this.requestData_;
            this.update({responseText: "",responseXml: null});
            this.abortedByTimeout_ = this.aborted = this.progress = !1;
            f = this.handlers_;
            for (var c, g = f.length - 1; c = f[g]; g--)
                c.handler.prepare && c.handler.prepare.call(c.thisObject || this);
            if (!this.aborted)
                return f = Object.iterate(this.params, function(b, a) {
                    return a == null || a && typeof a.toString == "function" && a.toString() == null ? null : b + "=" + String(a.toString()).replace(/[\%\=\&\<\>\s\+]/g, function(a) {
                        a = a.charCodeAt(0).toHex();
                        return "%" + (a.length < 2 ? "0" : "") + a
                    })
                }).filter(Function.$isNotNull).join("&"), u.test(d) ? h = this.postBody || f || "" : f && (b += (b.indexOf("?") == -1 ? "?" : "&") + f), this.requestData_ = {method: d,
                    location: b,contentType: this.contentType,encoding: this.encoding,asynchronous: this.asynchronous,headers: Object.extend({}, this.requestHeaders),postBody: h}, i.call(this, this.requestData_)
        },repeat: function() {
            if (this.requestData_)
                return this.abort(), i.call(this, this.requestData_)
        },get: function() {
            this.request.apply(this, arguments)
        },responseIsSuccess: function() {
            try {
                if (!this.aborted) {
                    var b = this.transport.status;
                    return b == void 0 || b == 0 || b >= 200 && this.transport.status < 300
                }
            } catch (d) {
            }
            return !1
        },getRequestError: function(b) {
            return {code: "SERVER_ERROR",
                msg: b.responseText}
        },destroy: function() {
            this.destroy = Function.$undef;
            delete this.requestData_;
            this.transport.onreadystatechange = Function.$undef;
            this.transport.abort();
            this.clearInfluence();
            this.inherit();
            delete this.transport;
            v.remove(this)
        }});
    Basis.namespace("Basis.Ajax").extend({Transport: k,TransportDispatcher: y})
})();
(function() {
    function n(b, g) {
        var d = y[this.guid], b = this.keyMapping(b);
        if (b == null)
            if (this.nullKeyExists)
                b = l;
            else
                return;
        var a = d[b];
        return a ? a : g ? w : (a = new v(b, this.adapterFactory), a.addHandler(z, this), d[b] = a)
    }
    var h = Basis.Class, i = Basis.Cleaner, k = Basis.EventObject, r = Basis.Data.DataObject, s = Basis.Data.STATE, v = h.create(r, {className: "Basis.Publish2.DataChunk",autorepair: !0,disabled: !1,state: s.UNDEFINED,behaviour: {subscribersChanged: function() {
                this.subscriberCount > 0 && (this.state == s.UNDEFINED || this.state == s.ERROR && 
                this.autorepair || this.state == s.DEPRECATED) && this.process()
            }},init: function(b, g) {
            this.inherit();
            this.key = b;
            this.adapterGetter = g
        },process: function(b, g) {
            if (g || this.subscriberCount != 0 && this.state != s.PROCESSING)
                (this.adapter = this.adapter || this.adapterGetter()) && this.adapter.start(this)
        },reset: function() {
            this.setState(s.UNDEFINED)
        },set: function(b) {
            this.update(b);
            this.setState(s.READY)
        },repair: function() {
            this.state == s.ERROR && (this.reset(), this.process())
        },deprecate: function() {
            this.subscriberCount == 0 ? this.reset() : 
            this.state != s.PROCESSING && this.process()
        },destroy: function() {
            delete this.adapterGetter;
            this.inherit()
        }}), w = new v, t;
    for (t in w)
        if (typeof w[t] == "function")
            w[t] = Function.$self;
    delete w.destroy;
    i.add(w);
    var A = {destroy: function() {
            this.unlink()
        }}, u = h.create(k, {linkedDataChunk: null,processing: !1,init: function(b) {
            this.inherit();
            return b || {}
        },start: function(b) {
            if (this.linkedDataChunk != b || !this.processing)
                this.link(b), this.processing = !0, this.dispatch("start")
        },stop: function() {
            if (this.processing)
                this.dispatch("stop"), 
                this.processing = !1
        },link: function(b) {
            if (this.linkedDataChunk != b)
                this.unlink(), this.linkedDataChunk = b, this.linkedDataChunk.addHandler(A, this), this.dispatch("link")
        },unlink: function() {
            this.linkedDataChunk && (this.stop(), this.dispatch("unlink"), this.linkedDataChunk.removeHandler(A, this), this.linkedDataChunk && this.linkedDataChunk.adapter == this && delete this.linkedDataChunk.adapter, delete this.linkedDataChunk)
        },destroy: function() {
        }}), f = {prepare: function() {
            this.callback.before && this.callback.before.apply(this.context, 
            [this.linkedDataChunk.key].concat(Array.from(arguments)))
        },start: function() {
            this.linkedDataChunk.setState(s.PROCESSING)
        },abort: function() {
            this.linkedDataChunk.setState(s.ERROR, "Data loading was canceled")
        },failure: function() {
            var b;
            this.callback.error && (b = this.callback.error.apply(this.context, arguments));
            this.linkedDataChunk.setState(s.ERROR, b || "Data load error")
        },timeout: function() {
            var b;
            this.callback.error && (b = this.callback.error.apply(this.context, arguments));
            this.linkedDataChunk.setState(s.ERROR, 
            b || "Data load error")
        },success: function() {
            var b = null, g;
            if (this.callback.after)
                try {
                    b = this.callback.after.apply(this.context, arguments)
                } catch (d) {
                    if (g = d, typeof g == "undefined")
                        g = void 0;
                    else {
                        var a;
                        try {
                            a = (g.name ? "Error" : g.name) + (Function.$defined(g.fileName) ? " in\n" + g.fileName : "") + (Function.$defined(g.lineNumber) ? "\nat line " + g.lineNumber : "") + (Function.$defined(g.number) ? "\nline: " + (g.number >> 16 & 8191) : "")
                        } catch (f) {
                        }
                        g = (a ? a + "\n\n" : "") + (g.message || g.description || g)
                    }
                }
            g ? (typeof console != "undefined" && console.warn(g), 
            this.linkedDataChunk.setState(s.ERROR, g)) : this.linkedDataChunk.set(b)
        },complete: function() {
            this.stop()
        }}, d = h.create(u, {behaviour: {link: function() {
                this.transport.abort()
            },unlink: function() {
                this.transport.abort()
            },start: function() {
                this.transport.get()
            },stop: function() {
            }},init: function(b) {
            b = this.inherit(b);
            this.context = this.transport = b.transport;
            this.transport.addHandler(f, this);
            this.callback = b.callback || {}
        },destroy: function() {
            this.transport.removeHandler(f, this);
            this.transport.destroy();
            delete this.transport;
            delete this.context;
            this.inherit()
        }}), B = h.create(d, {behaviour: {start: function() {
                this.method.call()
            }},init: function(b) {
            this.inherit(Object.complete({transport: b.transport.transport}, b));
            this.method = this.context = b.transport
        },destroy: function() {
            this.method.destroy();
            this.inherit()
        }}), C = h.create(r, {className: "Basis.Publish2.Subscriber",isActiveSubscriber: !0,subscriptionType: 1,init: function(b, g) {
            this.inherit();
            this.getter = b || Function.$null;
            g && this.addHandler(g.handler || g, g.thisObject || this);
            this.setDelegate(w)
        },
        select: function(b, g) {
            g && (g = !!this.getter(b, !0));
            this.setDelegate(this.getter(b) || w);
            g && this.deprecate()
        },deprecate: function() {
            this.delegate.deprecate()
        },repair: function() {
            this.delegate.repair()
        },update: function() {
            this.delegate && this.delegate !== w && console.log("Update! But no actions...")
        },destroy: function() {
            this.inherit()
        }}), y = {}, b = 0, l = "__NULL_KEY__", j = {sessionOpen: function(b) {
            var b = b.getData(this.guid) || {}, g = y[this.guid], d;
            for (d in g) {
                var a = b[d] || {};
                g[d].update(a.info);
                g[d].setState(a.state || s.UNDEFINED, 
                a.state && a.state.data)
            }
        },sessionClose: function(b) {
            var g = {}, d = y[this.guid], a;
            for (a in d) {
                var f = d[a];
                g[a] = {info: f.info,errorText: f.errorText,state: f.state};
                f.update({});
                f.setState(s.UNDEFINED)
            }
            b.storeData(this.guid, g)
        }}, z = {destroy: function(b) {
            delete y[this.guid][b.key]
        }}, h = h.create(k, {className: "Basis.Publish2.Publisher",guid: "",migrateKeys: !1,nullKeyExists: !1,loader: null,session: null,keyMapping: Function.$self,init: function(c) {
            this.inherit();
            this.guid = "publisher" + b++;
            y[this.guid] = {};
            if (c.adapterFactory)
                this.adapterFactory = 
                c.adapterFactory;
            else {
                var g = u, f;
                if (c.load)
                    f = c.load.transport, Basis.Ajax && (Basis.SOAP && f instanceof Basis.SOAP.ServiceCall ? g = B : f instanceof Basis.Ajax.Transport && (g = d)), c.error = c.error || c.loadError;
                this.adapterFactory = Function.lazyInit(function() {
                    return new g({transport: f,callback: c.load})
                })
            }
            this.keyMapping = c.keyMapping || this.keyMapping;
            this.nullKeyExists = c.nullKeyExists || this.nullKeyExists;
            if (c.session && (this.session = c.session, this.session.addHandler(j, this), c.migrateKeys))
                this.migrateKeys = !0;
            i.add(this)
        },
        clear: function() {
            for (var b = y[this.guid], g = Object.keys(b), d = 0; d < g.length; d++)
                b[g[d]].destroy()
        },disableDataChunk: function(b) {
            (b = n.call(this, b, !0)) && b.disabled.set(!0)
        },enableDataChunk: function(b) {
            (b = n.call(this, b, !0)) && b.disabled.set(!1)
        },deprecate: function(b) {
            (b = n.call(this, b, !0)) && b.deprecate()
        },createSubscriber: function(b) {
            return new C(n.bind(this), b)
        },destroy: function() {
            this.session && (this.session.removeHandler(j, this), delete this.session);
            this.clear();
            this.inherit();
            i.remove(this)
        }});
    Basis.namespace("Basis.Publish2").extend({Publisher: h,
        Subscriber: C,DataChunk: v,AbstractAdapter: u,AjaxAdapter: d,SOAPAdapter: B})
})();
(function() {
    var n = Basis.Class, h = Object.extend, i = Basis.EventObject;
    Basis.Browser.Cookies.get("DEBUG_MODE");
    var k, r, s = !1, v = {}, w = Date.now, t = h(new i, {isOpened: function() {
            return !!k
        },getTimestamp: function() {
            if (k)
                return r
        },open: function(i, f) {
            var d;
            v[i] || (v[i] = new A(i));
            d = v[i];
            k === d ? s && this.unfreeze() : (this.close(), k = d, r = w(), f && h(d.data, f), this.dispatch("sessionOpen", this))
        },close: function() {
            k && (s && this.unfreeze(), this.dispatch("sessionClose", this), r = k = null)
        },freeze: function() {
            k && !s && (this.dispatch("sessionFreeze", 
            this), s = !0, r = null)
        },unfreeze: function() {
            k && s && (s = !1, r = w(), this.dispatch("sessionUnfreeze", this))
        },storeData: function(h, f) {
            if (k)
                return k.storeData(h, f);
            else
                throw Error("No opened session");
        },getData: function(h) {
            if (k)
                return k.getData(h);
            else
                throw Error("No opened session");
        },destroy: function() {
            for (var h = Object.keys(v), f; f = h.pop(); )
                v[f].destroy();
            this.inherit()
        }}), A = n(i, {className: "Basis.Session.Session",behaviour: {destroy: function() {
                k == this && t.close();
                delete v[this.key]
            }},init: function(h) {
            this.inherit();
            this.key = h;
            this.data = {}
        },storeData: function(h, f) {
            if (s)
                throw Error("Session is frozen");
            return this.data[h] = f
        },getData: function(h) {
            if (s)
                throw Error("Session is frozen");
            return this.data[h]
        },destroy: function() {
            this.inherit();
            for (var h = Object.keys(this.data), f; f = h.pop(); ) {
                var d = this.data[f];
                d != null && typeof d.destroy == "function" && d.destroy();
                delete this.data[f]
            }
        }});
    Basis.namespace("Basis.Session").extend({SessionManager: t})
})();
(function() {
    function n(a, b) {
        if (c)
            try {
                return parseFloat(document.defaultView.getComputedStyle(a, null)[b])
            } catch (g) {
            }
        return 0
    }
    function h(a, b) {
        if (c)
            return n(a, "height");
        else {
            var g = a.currentStyle;
            s.Style.setStyle(b, {borderTop: g.borderTopWidth + " solid red",borderBottom: g.borderBottomWidth + " solid red",paddingTop: g.paddingTop,paddingBottom: g.paddingBottom,fontSize: 0.01,height: 0,overflow: "hidden"});
            return a.offsetHeight - b.offsetHeight
        }
    }
    function i(a, b) {
        if (c)
            return n(a, b) || 0;
        else {
            var g = 0;
            (b == "width" ? ["paddingLeft", 
                "paddingRight"] : ["paddingTop", "paddingBottom"]).forEach(function(b) {
                g += parseFloat(a.currentStyle[b]) || 0
            });
            return a["client" + b.capitalize()] - g
        }
    }
    function k(a, b) {
        if (z)
            return t(a).add("Basis-Layout-OnResizeElement"), a.attachEvent("onresize", b), b;
        else {
            var c = s.createElement({description: "IFRAME.Basis-Layout-OnResizeFrame",css: {position: "absolute",width: "100%",height: "100%",left: 0,zIndex: -1,top: "-2000px"}});
            s.insert(a, c);
            c.onload = function() {
                (c.contentWindow.onresize = b)()
            };
            return c
        }
    }
    for (var r = Basis.Class, 
    s = Basis.DOM, v = Basis.Browser, w = Object.extend, t = Basis.CSS.cssClass, A = Basis.Cleaner, u = s.Wrapper, f = v.test("IE"), d = v.test("IE7+"), B = !1, C = s.createElement(""), y = ["", "-webkit-"], b = 0; b < y.length; b++)
        try {
            if (!(y[b] == "-webkit-" && Basis.Browser.is("opera"))) {
                var l = y[b] + "box";
                C.style.display = l;
                if (C.style.display == l) {
                    B = y[b];
                    break
                }
            }
        } catch (j) {
        }
    var z = typeof C.onresize != "undefined" && C.attachEvent, c = document.defaultView && document.defaultView.getComputedStyle, C = function() {
        return s.createElement({css: {position: "absolute",
                top: 0,left: 0,width: 0,height: 0,padding: 0,margin: 0,border: 0}})
    };
    C.className = "Basis.Layout.Helper";
    var g = {top: Number.NaN,left: Number.NaN,bottom: Number.NaN,right: Number.NaN,width: Number.NaN,height: Number.NaN,defined: !1}, m = r(null, {className: "Basis.Layout.Box",init: function(a, b, c) {
            this.reset();
            this.setElement(a, b, c)
        },setElement: function(a, b, c) {
            this.element = s.get(a);
            this.offsetElement = c;
            b || this.recalc(this.offsetElement)
        },copy: function(a) {
            "top,left,bottom,right,height,width,defined".split(",").forEach(function(b) {
                this[b] = 
                a[b]
            }, this)
        },reset: function() {
            w(this, g)
        },set: function(a, b) {
            if (this.defined) {
                switch (a.toLowerCase()) {
                    case "left":
                        this.left = b;
                        this.right = this.left + this.width;
                        break;
                    case "right":
                        this.right = b;
                        this.left = this.right - this.width;
                        break;
                    case "width":
                        this.width = b;
                        this.right = this.left + this.width;
                        break;
                    case "top":
                        this.top = b;
                        this.bottom = this.top + this.height;
                        break;
                    case "bottom":
                        this.bottom = b;
                        this.top = this.bottom - this.height;
                        break;
                    case "height":
                        this.height = b, this.bottom = this.top + this.height
                }
                (this.width <= 0 || this.height <= 
                0) && this.reset()
            }
            return this
        },recalc: function(a) {
            this.reset();
            var b = this.element;
            if (b) {
                var c = b, g = document.documentElement;
                if (b.getBoundingClientRect)
                    c = b.getBoundingClientRect(), this.top = c.top, this.left = c.left, f && (d ? (this.top += g.scrollTop - g.clientTop, this.left += g.scrollLeft - g.clientLeft) : b != document.body && (this.top -= document.body.clientTop - document.body.scrollTop, this.left -= document.body.clientLeft - document.body.scrollLeft)), a && (a = new m(a), this.top -= a.top, this.left -= a.left, a.destroy());
                else if (document.getBoxObjectFor) {
                    var j = 
                    document.getBoxObjectFor(g), c = document.getBoxObjectFor(b);
                    this.top = c.screenY - j.screenY;
                    this.left = c.screenX - j.screenX;
                    if (v.test("FF1.5-")) {
                        if (c = b.offsetParent)
                            this.top -= c.scrollTop, this.left -= c.scrollLeft;
                        c != document.body && (this.top += g.scrollTop, this.left += g.scrollLeft)
                    }
                    if (v.test("FF2+")) {
                        if (this.top && (c = g.scrollTop, c > 2)) {
                            for (var j = 0, p = Math.floor(Math.log(c) / Math.LN2); p >= 0; p -= 3)
                                j += 1 << p;
                            c > j && (this.top -= 1)
                        }
                        this.left && (this.left -= g.scrollLeft > 1)
                    }
                    a && (a = new m(a), this.top -= a.top, this.left -= a.left, a.destroy())
                } else if (b != 
                a) {
                    this.top = b.offsetTop;
                    this.left = b.offsetLeft;
                    this.top -= document.body.clientTop - document.body.scrollTop;
                    for (this.left -= document.body.clientLeft - document.body.scrollLeft; (c = c.offsetParent) && c != a; )
                        this.top += c.offsetTop + c.clientTop - c.scrollTop, this.left += c.offsetLeft + c.clientLeft - c.scrollLeft
                } else
                    this.top = this.left = 0;
                this.width = b.offsetWidth;
                this.height = b.offsetHeight;
                this.bottom = this.top + this.height;
                this.right = this.left + this.width;
                this.defined = !0
            }
            return this.defined
        },intersection: function(a) {
            if (!this.defined)
                return !1;
            a instanceof m == !1 && (a = new m(a));
            return a.defined && a.right > this.left && a.left < this.right && a.bottom > this.top && a.top < this.bottom
        },inside: function(a) {
            if (!this.defined)
                return !1;
            a instanceof m == !1 && (a = new m(a));
            return a.defined && a.left >= this.left && a.right <= this.right && a.bottom >= this.bottom && a.top <= this.top
        },point: function(a) {
            if (!this.defined)
                return !1;
            var b = a.left || a.x || 0, a = a.top || a.y || 0;
            return b >= this.left && b < this.right && a >= this.top && a < this.bottom
        },power: function(a) {
            if (!this.defined)
                return !1;
            if (a = s.get(a) || 
            this.element)
                return s.setStyle(a, {top: this.top + "px",left: this.left + "px",width: this.width + "px",height: this.height + "px"}), !0
        },destroy: function() {
            delete this.element
        }}), y = r(m, {className: "Basis.Layout.Intersection",init: function(a, b, c) {
            this.setBoxes(a, b, c)
        },setBoxes: function(a, b, c) {
            this.boxA = a instanceof m ? a : new m(a, !0);
            this.boxB = b instanceof m ? b : new m(b, !0);
            c || this.recalc()
        },recalc: function() {
            this.reset();
            if (!this.boxA.recalc() || !this.boxB.recalc())
                return !1;
            if (this.boxA.intersection(this.boxB))
                this.top = 
                Math.max(this.boxA.top, this.boxB.top), this.left = Math.max(this.boxA.left, this.boxB.left), this.bottom = Math.min(this.boxA.bottom, this.boxB.bottom), this.right = Math.min(this.boxA.right, this.boxB.right), this.width = this.right - this.left, this.height = this.bottom - this.top, this.width <= 0 || this.height <= 0 ? this.reset() : this.defined = !0;
            return this.defined
        }}), b = r(m, {className: "Basis.Layout.Viewport",recalc: function() {
            this.reset();
            var a = this.element;
            if (a) {
                var b = a;
                this.width = a.clientWidth;
                this.height = a.clientHeight;
                if (a.getBoundingClientRect) {
                    var c = a.getBoundingClientRect();
                    this.top = c.top;
                    for (this.left = c.left; b = b.offsetParent; )
                        this.top -= b.scrollTop, this.left -= b.scrollLeft
                } else if (document.getBoxObjectFor) {
                    c = document.getBoxObjectFor(a);
                    this.top = c.y;
                    for (this.left = c.x; b = b.offsetParent; )
                        this.top -= b.scrollTop, this.left -= b.scrollLeft
                } else
                    c = new m(a), this.top = c.top + a.clientTop, this.left = c.left + a.clientLeft;
                this.bottom = this.top + this.height;
                this.right = this.left + this.width;
                this.defined = !0
            }
            return this.defined
        }}), a = 0;
    s.Style.cssRule(".Basis-VerticalPanel").setStyle({position: "relative"});
    l = s.Style.cssRule(".Basis-VerticalPanelStack");
    l.setStyle({overflow: "hidden"});
    B !== !1 && (l.setProperty("display", B + "box"), l.setProperty(B + "box-orient", "vertical"));
    var p = function() {
        this.parentNode && this.parentNode.realign()
    }, l = r(u.HtmlContainer, {className: "Basis.Layout.VerticalPanel",template: new Basis.Html.Template('<div{element|content|childNodesElement} class="Basis-VerticalPanel"/>'),flex: 0,init: function(a) {
            this.inherit(a);
            if (a) {
                if (a.flex)
                    this.flex = parseFloat(a.flex);
                this.flex ? B !== !1 && s.Style.setStyleProperty(this.element, 
                B + "box-flex", this.flex) : B === !1 && k(this.element, p.bind(this))
            }
        }}), D = function() {
        this.realign()
    }, u = r(u.HtmlContainer, {className: "Basis.Layout.VerticalPanelStack",childClass: l,template: new Basis.Html.Template('<div{element|content|childNodesElement} class="Basis-VerticalPanelStack">' + (B ? "" : '<div{ruller} style="position: absolute; visibility: hidden; top: -1000px; width: 10px;"/>') + "</div>"),init: function(b) {
            this.ruleClassName = "Basis-FlexStackPanel-" + ++a;
            this.cssRule = s.Style.cssRule("." + this.ruleClassName);
            this.cssRule.setProperty("overflow", "auto");
            b = this.inherit(b);
            B === !1 && (this.realign(), k(this.childNodesElement, D.bind(this)));
            return b
        },insertBefore: function(a, b) {
            if (a = this.inherit(a, b))
                return a.flex && this.cssRule && t(a.element).add(this.ruleClassName), this.realign(), a
        },removeChild: function(a) {
            if (this.inherit(a))
                return a.flex && this.cssRule && t(a.element).remove(this.ruleClassName), this.realign(), a
        },realign: function() {
            if (B === !1) {
                var a = this.element, b = this.lastChild.element, g = this.ruller, d = (new m(b, !1, 
                a)).bottom - n(a, "paddingTop") - n(a, "borderTopWidth") || 0, a = h(a, g);
                if (c)
                    d += n(b, "marginBottom");
                else {
                    var f = g.offsetHeight;
                    g.style.height = b.currentStyle.marginBottom;
                    d += g.offsetHeight - f
                }
                if (d = a - d) {
                    for (a = b = 0; f = this.childNodes[a]; a++)
                        f.flex && (b++, d += h(f.element, g));
                    b && this.cssRule.setProperty("height", Math.max(0, d / b) + "px")
                }
            }
        }}), o = {HORIZONTAL: 1,VERTICAL: 2,BOTH: 3};
    s.Style.cssRule(".Basis-Strut").setStyle({left: "0",top: "0",right: "0",bottom: "0",position: "absolute",visibility: "hidden"});
    var H = function() {
        this.resize()
    }, 
    r = r(null, {className: "Basis.Layout.Strut",type: o.HORIZONTAL,source: null,target: null,init: function(a) {
            this.inherit(a);
            if (a.type)
                this.type = a.type;
            this.source = a.source.element || a.source;
            this.target = a.target.element || a.target;
            this.element = s.createElement(".Basis-Strut");
            if (a.id)
                this.element.id = a.id;
            a = "genericStrutRule-" + (this.element.id || "");
            t(this.target).add(a);
            this.targetRule = s.Style.cssRule("." + a);
            s.insert(this.source, this.element);
            this.resizeHandler = k(this.element, H.bind(this));
            A.add(this)
        },resize: function() {
            var a = 
            {};
            if (this.type & o.HORIZONTAL)
                a.width = i(this.element, "width") + "px";
            if (this.type & o.VERTICAL)
                a.height = i(this.element, "height") + "px";
            this.targetRule.setStyle(a)
        },destroy: function() {
            var a = this.resizeHandler;
            z ? a.detachEvent("onresize", void 0) : s.remove(a);
            this.target = this.source = this.targetRule = this.resizeHandler = null;
            A.remove(this)
        }});
    Basis.namespace("Basis.Layout").extend({STRUT_TYPE: o,Strut: r,Box: m,Intersection: y,Viewport: b,VerticalPanel: l,VerticalPanelStack: u,Helper: C})
})();
(function() {
    function n(b) {
        return {hour: b.getHours(),day: b.getDate() - 1,month: b.getMonth(),year: b.getFullYear()}
    }
    function h(b, d) {
        var f = {}, h = B[b];
        if (h) {
            var c = d.getFullYear(), g = d.getMonth(), m = d.getDate();
            c -= c % h[1];
            g = h[2] ? g - g % h[2] : 0;
            m = h[3] ? m : 1;
            f.periodStart = new Date(c, g, m);
            f.periodEnd = new Date(new Date(c + h[4], g + h[5], m + h[6]) - 1)
        } else
            f.periodStart = new Date(f.periodEnd = new Date(d));
        return f
    }
    var i = Basis.Class, k = Basis.Event, r = Basis.DOM, s = Basis.Html.Template, v = Function.getter, w = Basis.CSS.cssClass, t = r.Wrapper, 
    A = Basis.Data.Property.Property, u = function(b) {
        var d = Basis.Locale["Controls.Calendar"];
        return d ? d[b] : b
    }, f = {};
    (function() {
        for (var b = 32, d = 2147483647; --b; )
            f[b] = d, d >>= 1
    })();
    var d = {century: function(b) {
            return b.periodStart.getFullYear() + " - " + b.periodEnd.getFullYear()
        },decade: function(b) {
            return b.periodStart.getFullYear() + " - " + b.periodEnd.getFullYear()
        },year: function(b) {
            return b.periodStart.getFullYear()
        },quarter: function(b) {
            return u("QUARTER").toLowerCase().format(1 + b.periodStart.getMonth().base(3) / 3)
        },
        month: function(b) {
            return u("MONTH").SHORT[b.periodStart.getMonth()].toLowerCase()
        },day: function(b) {
            return b.periodStart.getDate()
        }}, B = {century: ["year", 100, 0, 0, 100, 0, 0],decade: ["year", 10, 0, 0, 10, 0, 0],year: ["year", 1, 0, 0, 1, 0, 0],quarter: ["month", 1, 3, 0, 0, 3, 0],month: ["month", 1, 1, 0, 0, 1, 0],day: ["day", 1, 1, 1, 0, 0, 1]}, C = i(t.HtmlNode, {className: "Basis.Controls.Calendar.Calendar.Node",canHaveChildren: !1,template: new s('<a{element|content} class="Basis-Calendar-Node" href="#move:down">{title|-}</a>'),behaviour: {select: function() {
                this.inherit();
                r.focus(this.element)
            },update: function(b, f) {
                this.inherit(b, f);
                if ("periodStart" in f || "periodEnd" in f)
                    this.title.nodeValue = d[this.nodePeriodName](this.info), this.parentNode && w(this.element).bool("before", this.info.periodStart < this.parentNode.info.periodStart).bool("after", this.info.periodEnd > this.parentNode.info.periodEnd)
            }},init: function(b) {
            this.nodePeriodName = b;
            config = this.inherit({});
            w(this.element).add(b);
            return config
        }}), y = i(t.HtmlContainer, {className: "Basis.Controls.Calendar.Calendar.Section",
        childClass: C,childFactory: function(b) {
            return new C(b)
        },template: new s('<div{element|selectedElement} class="Basis-Calendar-Section"><div class="Basis-Calendar-SectionTitle">{titleText}</div><div{content|childNodesElement} class="Basis-Calendar-SectionContent"/></div>'),behaviour: {select: function() {
                this.inherit();
                w(this.titleElement).add("selected")
            },unselect: function() {
                this.inherit();
                w(this.titleElement).remove("selected")
            },update: function(b, d) {
                this.inherit(b, d);
                var f = this.info;
                if ("periodStart" in 
                d || "periodEnd" in d) {
                    this.setTitle();
                    f = h(this.nodePeriodName, (new Date(f.periodStart)).add(this.nodePeriodUnit, -this.nodePeriodUnitCount * (this.getInitOffset(f.periodStart) || 0)));
                    this.minDate = f.periodStart;
                    for (var i = this.firstChild; i; i = i.nextSibling)
                        i.update(f), f = h(this.nodePeriodName, (new Date(f.periodStart)).add(this.nodePeriodUnit, this.nodePeriodUnitCount));
                    this.maxDate = f.periodEnd
                }
                this.tabTitleText.nodeValue = this.getTabTitle(this.info.selectedDate) || "-";
                (i = this.getNodeByDate(this.info.selectedDate)) ? 
                i.select() : this.selection.clear()
            }},minDate: new Date,maxDate: new Date,isPrevPeriodEnabled: !0,isNextPeriodEnabled: !0,periodName: "period",nodeCount: 12,nodePeriodName: "-",nodePeriodUnit: "-",nodePeriodUnitCount: 1,init: function(b) {
            b = Object.complete({selection: new t.Selection(b && b.selection)}, b);
            this.titleElement = r.createElement({description: ".Basis-Calendar-SectionTab",click: this.select.bind(this, !1)}, this.tabTitleText = r.createText(""));
            b = this.inherit(b);
            w(this.element).add("Basis-Calendar-Section-" + this.sectionName);
            r.insert(this, [this.nodePeriodName].repeat(this.nodeCount));
            b.viewDate && this.setViewDate(b.viewDate);
            b.selectedDate && this.update({selectedDate: b.selectedDate});
            return b
        },getTitle: function() {
        },getTabTitle: function() {
            return "1"
        },setTitle: function() {
            if (this.info.periodStart)
                this.titleText.nodeValue = this.getTitle(this.info.periodStart) || "-"
        },getNodeByDate: function(b) {
            return b && this.info.periodStart <= b && b <= this.info.periodEnd && (b = this.childNodes.binarySearchInterval(b, "info.periodStart", "info.periodEnd"), 
            b != -1) ? this.childNodes[b] : null
        },nextPeriod: function(b) {
            (b ? this.isNextPeriodEnabled : this.isPrevPeriodEnabled) && this.update(h(this.periodName, new Date(b ? Number(this.info.periodEnd) + 1 : Number(this.info.periodStart) - 1)))
        },setViewDate: function(b) {
            this.update(h(this.periodName, b))
        },getInitOffset: Function.$null});
    y.Month = i(y, {className: "Basis.Controls.Calendar.Section.Month",sectionName: "Month",periodName: "month",template: new s(Function.lazyInit(function() {
            return '<div{element|selectedElement} class="Basis-Calendar-Section"><div class="Basis-Calendar-SectionTitle">{titleText}</div><div{content|childNodesElement} class="Basis-Calendar-SectionContent"><div class="week_days">' + 
            u("DAY").SHORT2.map(String.format, "<span>{0}</span>").join("") + "</div></div></div>"
        })),nodeCount: 42,nodePeriodName: "day",nodePeriodUnit: "day",getTabTitle: v("getDate()"),getTitle: function() {
            return u("MONTH").FULL[this.info.periodStart.getMonth()] + " " + this.info.periodStart.getFullYear()
        },getInitOffset: function(b) {
            return 1 + ((new Date(b)).set("day", 1).getDay() + 5) % 7
        }});
    y.Year = i(y, {className: "Basis.Controls.Calendar.Section.Year",sectionName: "Year",periodName: "year",nodePeriodName: "month",nodePeriodUnit: "month",
        init: function(b) {
            return b = this.inherit(b)
        },getTabTitle: v("getMonth()", function(b) {
            return u("MONTH").FULL[b]
        }),getTitle: v("getFullYear()")});
    y.YearDecade = i(y, {className: "Basis.Controls.Calendar.Section.YearDecade",sectionName: "YearDecade",periodName: "decade",nodePeriodName: "year",nodePeriodUnit: "year",getInitOffset: function() {
            return 1
        },getTabTitle: v("getFullYear()"),getTitle: function() {
            return this.info.periodStart.getFullYear() + " - " + this.info.periodEnd.getFullYear()
        }});
    y.Century = i(y, {className: "Basis.Controls.Calendar.Section.Century",
        sectionName: "Century",periodName: "century",nodePeriodName: "decade",nodePeriodUnit: "year",nodePeriodUnitCount: 10,getTabTitle: function(b) {
            if (b)
                return b = b.getFullYear(), b -= b % 10, b + "-" + (Number(b.toString().substr(-2)) + 9).lead(2)
        },getInitOffset: function() {
            return 1
        }});
    y.YearQuarters = i(y, {className: "Basis.Controls.Calendar.Section.YearQuarter",sectionName: "YearQuarter",periodName: "year",nodeCount: 4,nodePeriodName: "quarter",nodePeriodUnit: "month",nodePeriodUnitCount: 3});
    y.Quarter = i(y, {className: "Basis.Controls.Calendar.Section.Quarter",
        sectionName: "Quarter",periodName: "quarter",nodeCount: 3,nodePeriodName: "month",nodePeriodUnit: "month",getTitle: function() {
            return [Math.floor(1 + date.getMonth().base(3) / 3), u("QUARTER").toLowerCase(), date.getFullYear()].join(" ")
        }});
    i = i(t.HtmlControl, {className: "Basis.Controls.Calendar.Calendar",canHaveChildren: !0,childClass: y,childFactory: function(b) {
            return new y[b]({viewDate: this.date.value,selectedDate: this.selectedDate.value})
        },template: new s(Function.lazyInit(function() {
            return '<div{element} class="Basis-Calendar"><div{headerElement} class="Basis-Calendar-Header"><div{sectionTabs} class="Basis-Calendar-SectionTabs">{titleText}</div></div><div class="Basis-Calendar-Body"><a{prev} href="#move:prev" class="Basis-Calendar-ButtonPrevPeriod"><span>\u2039</span><span class="over"></span></a><a{next} href="#move:next" class="Basis-Calendar-ButtonNextPeriod"><span>\u203a</span><span class="over"></span></a><div{content|childNodesElement} class="Basis-Calendar-Content"/></div><div{footerElement} class="Basis-Calendar-Footer"><div class="today"><label>' + 
            u("TODAY") + ':</label><a href="#select:today" class="value">{todayText}</a></div></div></div>'
        })),behaviour: {childNodesModified: function() {
                this.childNodes.forEach(v("setTitle()"));
                r.insert(r.clear(this.sectionTabs), this.childNodes.map(v("titleElement")))
            },click: function(b, d) {
                if (d instanceof C)
                    this.selectedDate.set((new Date(this.selectedDate.value)).add(this.activeSection.nodePeriodUnit, this.selectedDate.value.diff(this.activeSection.nodePeriodUnit, d.info.periodStart))), this.nextSection(!1);
                else {
                    var f = 
                    k.sender(b);
                    r.is(f, "A") || (f = r.parent(f, "A", 0, this.element));
                    if (f && f.hash && !w(f).has("disabled"))
                        switch (f.hash.substr(1)) {
                            case "select:today":
                                this.selectedDate.set(new Date);
                                break;
                            case "select:current":
                                this.selectDate(this.date.value);
                                break;
                            case "move:prev":
                                this.nextPeriod(!1);
                                break;
                            case "move:next":
                                this.nextPeriod(!0);
                                break;
                            case "move:up":
                                this.nextSection(!0)
                        }
                }
                k.kill(b)
            }},minDate: null,maxDate: null,map: {},periodEnableByDefault: !0,init: function(b) {
            b = this.inherit(Object.complete({selection: {handlersContext: this,
                    handlers: {change: function() {
                            var b = this.selection.pick();
                            (this.activeSection = b) && b.update({selectedDate: this.selectedDate.value})
                        }}}}, b));
            this.todayDate = new A(new Date);
            this.date = new A(new Date(b.date || new Date));
            this.selectedDate = new A(new Date(b.date || new Date));
            this.selectedDate.addHandler({change: function(b) {
                    for (var d = this.firstChild; d; d = d.nextSibling)
                        d.update({selectedDate: b})
                }}, this);
            this.todayDate.addLink(this.todayText, null, v("toFormat('%D.%M.%Y')"));
            if (b.minDate)
                this.minDate = b.minDate;
            if (b.maxDate)
                this.maxDate = 
                b.maxDate;
            if (b.map)
                this.map = b.map;
            if (b.defaultState)
                this.periodEnableByDefault = b.defaultState == "enabled";
            r.insert(this, b.sections || ["Month", "Year", "YearDecade"]);
            this.addEventListener("click");
            this.firstChild && this.firstChild.select()
        },setSection: function(b) {
            (b = this.childNodes.search("sectionName", b)) && b.select()
        },nextSection: function(b) {
            var d = b ? this.activeSection.nextSibling : this.activeSection.previousSibling;
            d ? (d.select(), d.setViewDate(this.selectedDate.value)) : !b && this.dispatch("change")
        },nextPeriod: function(b) {
            this.activeSection.nextPeriod(b)
        },
        selectDate: function(b) {
            b - this.date.value != 0 && this.date.set(b)
        },getNextPeriod: function(b, d) {
            if (!this.isNextPeriodEnabled(b, d))
                return !1;
            if (this.map) {
                var j = d ? 1 : -1, i = d ? "start" : "till", c = d ? "till" : "start", g = (new Date(b)).add("millisecond", j), m = this.map[this.periodEnableByDefault ? "disabled" : "enabled"];
                if (m) {
                    var a = h("year", g);
                    for (a.periodEnd.getFullYear() == g.getFullYear() && (a[i] = g); !this.isPeriodEnabled(a.periodStart, a.periodEnd); )
                        a = h("year", g.add("year", j));
                    for (a[c] = h("month", a[i])[c]; !this.isPeriodEnabled(a.periodStart, 
                    a.periodEnd); )
                        a = h("month", g.add("month", j));
                    var p = n(a[i]), c = n(a[c]);
                    if (m = m[c.year] && m[c.year][c.month]) {
                        this.periodEnableByDefault && (i = f[a.periodEnd.getMonthDayCount()], m = m & i ^ i);
                        for (i = p.day; i != c.day + j; i += j)
                            if (m >> i & 1) {
                                g = new Date(p.year, p.month, i + 1);
                                break
                            }
                    } else
                        return h("day", a[i])
                }
            }
            return h("day", g)
        },isNextPeriodEnabled: function(b, d) {
            if (!d && this.minDate && this.minDate > b)
                return !1;
            if (d && this.maxDate && this.maxDate < b)
                return !1;
            if (this.map)
                if (this.periodEnableByDefault) {
                    if (!d && this.minDate)
                        return this.isPeriodEnabled(this.minDate, 
                        b);
                    if (d && this.maxDate)
                        return this.isPeriodEnabled(b, this.maxDate)
                } else {
                    var f = d ? 1 : -1, i = b.getFullYear(), c = (new Date(b)).add("millisecond", f), g = c.getFullYear(), m = Object.keys(this.map.enable).filter(function(a) {
                        return f * a >= f * g
                    }), a = m.length;
                    if (a)
                        for (var m = m.sort(function(a, b) {
                            return f * (a > b) || -f * (a < b)
                        }), p = 0; p < a; p++) {
                            var k = h("year", new Date(m[p], 0));
                            if (this.isPeriodEnabled(d && m[p] == i ? c : k.periodStart, !d && m[p] == i ? c : k.periodEnd))
                                return !0
                        }
                    return !1
                }
            return !0
        },isPeriodEnabled: function(b, d) {
            if (this.minDate && this.minDate > 
            d)
                return !1;
            if (this.maxDate && this.maxDate < b)
                return !1;
            var j = this.map && this.map[this.periodEnableByDefault ? "disabled" : "enabled"];
            if (j) {
                var h = n(b), c = n(d), g, m, a, p = h.month, i = new Date(h.year, h.month), o = 11 - h.month, k = o + 1 + (c.year - h.year - 1) * 12 + (c.month + 1) - 1;
                if (this.periodEnableByDefault) {
                    if (k == 0)
                        return !(g = j[h.year]) || !(m = g[h.month]) || (m ^ 2147483647) >> h.day & f[c.day - h.day + 1];
                    for (var e = 0; e <= k; e++) {
                        if (!e || o == e % 12)
                            if (g = j[i.getFullYear()], !g)
                                return !0;
                        m = g[p = i.getMonth()];
                        if (!m)
                            return !0;
                        a = f[i.getMonthDayCount()];
                        if (e / 
                        k ? e / k == 1 ? (m & a ^ a) & f[c.day + 1] : m & a ^ a : (m & a ^ a) >> h.day)
                            return !0;
                        i.setMonth(p + 1)
                    }
                } else {
                    if (k == 0)
                        return (g = j[h.year]) && (m = g[h.month]) && m >> h.day & f[c.day - h.day + 1];
                    for (e = 0; e <= k; e++) {
                        if (!e || o == e % 12 || !g)
                            if (g = j[i.getFullYear()], !g) {
                                e += 12;
                                i.setMonth(p + 12);
                                continue
                            }
                        if ((m = g[p = i.getMonth()]) && (e / k ? e / k == 1 ? m & f[c.day + 1] : m : m >> h.day))
                            return !0;
                        i.setMonth(p + 1)
                    }
                }
                return !1
            }
            return !0
        },destroy: function() {
            this.inherit();
            this.date.destroy();
            this.todayDate.destroy()
        }});
    Basis.namespace("Basis.Controls.Calendar").extend({Calendar: i,CalendarSection: y})
})();
(function() {
    var n = Basis.Class, h = Basis.Event, i = Basis.DOM, k = Basis.Html.Template, r = Object.extend, s = Object.complete, v = Function.getter, w = Basis.CSS.cssClass, t = i.Wrapper, A = n(t.HtmlNode, {className: "Basis.Controls.Button.Button",template: new k('<div{element} class="Basis-Button"><div class="Basis-Button-Wraper"><div class="Basis-Button-Wraper2"><a{content} class="Basis-Button-Content" href="#"><em class="pre"/><span class="caption">{captionText}</span><em class="post"/></a></div></div></div>'),behaviour: {select: function() {
                i.focus(this.content)
            }},
        captionGetter: v("caption"),caption: "[no title]",groupId: 0,name: null,init: function(f) {
            var f = r({}, f), d = r({}, f.handlers);
            f.handler && s(d, {click: f.handler});
            Object.keys(d) ? f.handlers = d : delete f.handlers;
            if (f.captionGetter)
                this.captionGetter = Function.getter(f.captionGetter);
            if (f.groupId)
                this.groupId = f.groupId;
            if (f.name)
                this.name = f.name;
            this.inherit(f);
            this.setCaption("caption" in f ? f.caption : this.caption);
            h.addHandler(this.element, "click", function(d) {
                this.click();
                h.kill(d)
            }, this);
            h.addHandler(this.element, 
            "keydown", function(d) {
                [h.KEY.ENTER, h.KEY.CTRL_ENTER, h.KEY.SPACE].has(h.key(d)) && (this.click(), h.kill(d))
            }, this)
        },click: function() {
            this.isDisabled() || this.dispatch("click")
        },setCaption: function(f) {
            this.caption = f;
            this.captionText.nodeValue = this.captionGetter(this)
        },setTitle: function(f) {
            return this.setCaption(f)
        },destroy: function() {
            h.clearHandlers(this.element);
            this.inherit()
        }}), u = n(t.HtmlGroupControl, {className: "Basis.Controls.Button.ButtonGroupControl",childClass: n(t.HtmlPartitionNode, {className: "Basis.Controls.Button.ButtonPartitionNode",
            behaviour: {childNodesModified: function(f) {
                    for (var d = 0, h; h = this.childNodes[d]; d++)
                        w(h.element).bool("first", h == f.firstChild).bool("last", h == f.lastChild)
                }},template: new k('<div{element|content|childNodesElement} class="Basis-ButtonGroup"></div>')})}), n = n(t.HtmlControl, {className: "Basis.Controls.Button.ButtonPanel",template: new k('<div{element} class="Basis-ButtonPanel"><div{childNodesElement|content|disabledElement} class="Basis-ButtonPanel-Content"/></div>'),childClass: A,groupControlClass: u,localGrouping: {groupGetter: v("groupId || -object.eventObjectId")},
        getButtonByName: function(f) {
            return this.childNodes.search(f, v("name"))
        }});
    Basis.namespace("Basis.Controls.Button").extend({Button: A,ButtonPanel: n,ButtonGroupControl: u})
})();
(function() {
    var n = Basis.Class, h = Basis.Event, i = Basis.DOM, k = Basis.Html.Template, r = Basis.Cleaner, s = Object.complete, v = Object.coalesce, w = Function.getter, t = Basis.CSS.cssClass, A = Basis.EventObject.createBehaviour, u = i.Wrapper, f = u.Control, d = u.HtmlNode, B = u.Selection, C = Basis.Data.Property.AbstractProperty, y = Basis.Data.Property.Property, b = n(d, {className: "Basis.Controls.Form.Field",canHaveChildren: !1,serializable: !0,behaviour: {select: function() {
                i.focus(this.field, !0)
            },keypress: function(a, b) {
                if (b = h(b)) {
                    var c = h.key(b);
                    (a.nextFieldOnEnter || b.ctrlKey) && c == h.KEY.ENTER || c == h.KEY.CTRL_ENTER ? (h.cancelDefault(b), a.nextFieldFocus()) : a.setValid()
                }
            },enable: function() {
                this.field.removeAttribute("disabled");
                t(this.element).remove("disabled")
            },disable: function() {
                this.field.setAttribute("disabled", "disabled");
                t(this.element).add("disabled")
            },blur: function(a) {
                a.validate(!0)
            },focus: function(a) {
                a.valid && a.setValid()
            }},template: new k('<div{element|sampleContainer} class="fieldWraper"><div class="title"><label><span{title}/></label></div><div{fieldContainer|content} class="field"/></div>'),
        tableTemplate: new k('<tr{element} class="fieldWraper"><td class="title"><label><span{title}/></label></td><td{sampleContainer} class="field"><div{fieldContainer|content} class="field-wraper"/></td></tr>'),init: function(a) {
            this.fieldTemplate && this.fieldTemplate.createInstance(this);
            if (this.tableLayout = a.tableLayout)
                this.template = this.tableTemplate;
            a = this.inherit(a);
            this.name = a.name || a.id;
            this.id = a.id;
            if (this.field && a.name)
                this.field.name = a.name;
            this.fieldContainer && i.insert(this.fieldContainer, this.field);
            this.title && i.insert(this.title, a.title);
            if (a.button)
                t(this.element).add("have-button"), this.button = i.createElement("BUTTON", a.caption || "..."), a.button.handler && h.addHandler(this.button, "click", a.button.handler, this.button), i.insert(this.field.parentNode, this.button, i.INSERT_AFTER, this.field);
            this.nextFieldOnEnter = Function.$defined(a.nextFieldOnEnter) ? a.nextFieldOnEnter : !0;
            h.addHandler(this.field, "keyup", this.keyup, this);
            h.addHandler(this.field, "keypress", this.keypress, this);
            h.addHandler(this.field, 
            "blur", this.blur, this);
            h.addHandler(this.field, "focus", this.focus, this);
            h.addHandler(this.field, "change", this.change, this);
            this.validators = [];
            if (a.validators)
                for (var b = 0; b < a.validators.length; b++)
                    this.attachValidator(a.validators[b]);
            this.setSample(a.sample);
            a.minLength && this.setMinLength(a.minLength);
            a.maxLength && this.setMaxLength(a.maxLength);
            Function.$defined(a.readOnly) && this.setReadOnly(a.readOnly);
            Function.$defined(a.disabled) && a.disabled && this.disable();
            if (Function.$defined(a.serializable))
                this.serializable = 
                a.serializable;
            if (Function.$defined(a.size))
                this.field.size = a.size;
            if (typeof a.value != "undefined")
                this.defaultValue = a.value, this.setDefaultValue();
            return a
        },setReadOnly: function(a) {
            a ? this.field.setAttribute("readonly", "readonly", 0) : this.field.removeAttribute("readonly", 0)
        },setDefaultValue: function() {
            typeof this.defaultValue != "undefined" && (this.setValue(this.defaultValue), this.setValid())
        },setSample: function(a) {
            if (this.sampleContainer && Function.$defined(a) && a != "")
                this.sample ? i.insert(i.clear(this.sample), 
                a) : i.insert(this.sampleContainer, this.sample = i.createElement("SPAN.sample", a));
            else if (this.sample)
                i.remove(this.sample), this.sample = null
        },getValue: function() {
            return this.field.value
        },setValue: function(a) {
            this.field.value = Function.$defined(a) ? a : "";
            this.change()
        },disable: function() {
            if (!this.disabled)
                this.disabled = !0, this.dispatch("disable")
        },change: function() {
            this.dispatch("change", this)
        },setMaxLength: function(a) {
            this.maxLength = a
        },setMinLength: function(a) {
            this.minLength = a
        },attachValidator: function(a, 
        b) {
            this.validators.add(a) && b && this.validate()
        },detachValidator: function(a, b) {
            this.validators.remove(a) && b && this.validate()
        },keyup: function(a) {
            this.dispatch("keyup", this, a)
        },keypress: function(a) {
            this.dispatch("keypress", this, a)
        },blur: function(a) {
            this.dispatch("blur", this, a)
        },focus: function(a) {
            this.dispatch("focus", this, a)
        },select: function() {
            this.unselect();
            this.inherit.apply(this, arguments)
        },setValid: function(a, b) {
            typeof a == "boolean" ? (t(this.element).bool("invalid", !a).bool("valid", a), b ? this.element.title = 
            b : this.element.removeAttribute("title")) : (t(this.element).remove("invalid", "valid"), this.element.removeAttribute("title"));
            this.valid = a
        },validate: function(a) {
            var b;
            this.setValid();
            for (var c = 0; c < this.validators.length; c++)
                if (b = this.validators[c](this))
                    return a || this.setValid(!1, b.message), b;
            this.getValue() != "" && this.setValid(!0)
        },nextFieldFocus: function() {
            var a = i.axis(this, i.AXIS_FOLLOWING_SIBLING).search(!0, "selectable");
            a ? a.select() : this.parentNode && this.parentNode.submit && this.parentNode.submit()
        },
        destroy: function() {
            h.clearHandlers(this.element);
            h.clearHandlers(this.field);
            this.button && (h.clearHandlers(this.button), delete this.button);
            this.validators.clear();
            this.inherit();
            delete this.sample;
            delete this.sampleContainer;
            delete this.defaultValue;
            delete this.field
        }});
    b.create = function(a, c) {
        a = {radiogroup: "RadioGroup",checkgroup: "CheckGroup"}[a.toLowerCase()] || a.capitalize();
        if (b[a])
            return new b[a](c);
        else
            throw Error("Wrong field type `{0}`".format(a));
    };
    b.Hidden = n(b, {className: "Basis.Controls.Form.Field.Hidden",
        selectable: !1,template: new k(""),fieldTemplate: new k('<input{field|element} type="hidden"/>'),init: function(a) {
            a.value = v(a.value, "");
            this.inherit(a)
        }});
    b.Text = n(b, {className: "Basis.Controls.Form.Field.Text",fieldTemplate: new k('<input{field|element} type="text"/>'),init: function(a) {
            if (a.minLength) {
                if (!a.validators)
                    a.validators = [];
                a.validators.push(p.MinLength)
            }
            a.value = v(a.value, "");
            return this.inherit(a)
        },setMaxLength: function(a) {
            a = a * 1 || 0;
            this.field.setAttribute("maxlength", a, 0);
            this.inherit(a)
        }});
    b.Password = n(b.Text, {className: "Basis.Controls.Form.Field.Password",fieldTemplate: new k('<input{field|element} type="password"/>')});
    b.File = n(b, {className: "Basis.Controls.Form.Field.File",fieldTemplate: new k('<input{field|element} type="file"/>'),init: function(a) {
            a.value = "";
            this.inherit(a)
        }});
    b.Textarea = n(b, {className: "Basis.Controls.Form.Field.Textarea",fieldTemplate: new k("<textarea{field|element}/>"),init: function(a) {
            if (!a.validators)
                a.validators = [];
            a.minLength && a.validators.push(p.MinLength);
            a.maxLength && a.validators.push(p.MaxLength);
            a.value = v(a.value, "");
            a.nextFieldOnEnter = !1;
            this.counter = i.createElement(".counter", b.LOCALE.Textarea.SYMBOLS_LEFT + ": ", i.createText(0));
            a = this.inherit(a);
            h.addHandler(this.field, "keyup", this.updateCounter, this);
            h.addHandler(this.field, "input", this.updateCounter, this);
            window.opera && h.addHandler(this.field, "focus", function() {
                this.contentEditable = !0;
                this.contentEditable = !1
            }, this.field);
            return a
        },updateCounter: function() {
            var a = this.maxLength - this.getValue().length;
            this.counter.lastChild.nodeValue = a >= 0 ? a : 0
        },setValue: function(a) {
            this.inherit(a);
            this.updateCounter()
        },setMaxLength: function(a) {
            this.inherit(a);
            a ? (this.updateCounter(), i.insert(this.sampleContainer, this.counter)) : i.remove(this.counter)
        },destroy: function() {
            delete this.counter;
            this.inherit()
        }});
    b.Checkbox = n(b, {className: "Basis.Controls.Form.Field.Checkbox",fieldTemplate: new k('<input{field|element} type="checkbox"/>'),init: function(a) {
            a.value = v(a.value, !1);
            this.inherit(a);
            if (!this.tableLayout)
                a = this.element.firstChild.firstChild, 
                i.remove(this.element.firstChild), i.insert(this.field.parentNode, a), i.insert(a, this.field, i.INSERT_BEGIN)
        },invert: function() {
            this.setValue(!this.getValue())
        },setValue: function(a) {
            var b = this.field.checked;
            this.field.checked = Boolean.normalize(a);
            b != this.field.checked && this.change()
        },getValue: function() {
            return this.field.checked
        }});
    b.Label = n(b, {className: "Basis.Controls.Form.Field.Label",fieldTemplate: new k('<div{field|element} class="label">{fieldValueText}</div>'),setValue: function(a) {
            this.inherit(a);
            this.fieldValueText.nodeValue = this.field.value
        }});
    var l = n(d, {className: "Basis.Controls.Form.ComplexFieldItem",canHaveChildren: !1,valueGetter: w("value"),titleGetter: function(a) {
            return v(a.title, a.value)
        },init: function(a) {
            if (a && typeof a.valueGetter == "function")
                this.valueGetter = a.valueGetter;
            if (a && typeof a.titleGetter == "function")
                this.titleGetter = a.titleGetter;
            a = this.inherit(a);
            this.element.node = this;
            return a
        },getTitle: function() {
            return this.titleGetter(this.info, this)
        },getValue: function() {
            return this.valueGetter(this.info, 
            this)
        },destroy: function() {
            this.element.node = null;
            this.inherit()
        }}), u = n(b, u.HtmlContainer, {className: "Basis.Controls.Form.Field.ComplexField",canHaveChildren: !0,childFactory: function(a) {
            var b = {valueGetter: this.itemValueGetter,titleGetter: this.itemTitleGetter};
            a.info || a.delegate ? s(b, a) : b.info = a;
            return new this.childClass(b)
        },multipleSelect: !1,itemValueGetter: w("value"),itemTitleGetter: function(a) {
            return v(a.title, a.value)
        },init: function(a) {
            this.selection = new B({multiple: !!this.multipleSelect});
            this.selection.addHandler({change: function() {
                    var a = 
                    this.selection.getItems().map(w("getValue()"));
                    this.setValue(!this.selection.multiple ? a[0] : a)
                }}, this);
            if (a.itemValueGetter)
                this.itemValueGetter = w(a.itemValueGetter);
            if (a.itemTitleGetter)
                this.itemTitleGetter = w(a.itemTitleGetter);
            a = this.inherit(a);
            a.items && i.insert(this, a.items);
            if (!("value" in a))
                this.defaultValue = this.getValue();
            r.add(this);
            return a
        },getValue: function() {
            var a = this.selection.getItems().map(w("getValue()"));
            return !this.selection.multiple ? a[0] : a
        },setValue: function(a) {
            var b = {};
            (this.selection.multiple ? 
            a instanceof C ? Array.from(a.value).map(function(a) {
                return this.itemValueGetter(a.value)
            }, this) : Array.from(a) : [a]).forEach(function(a) {
                this[a] = !0
            }, b);
            for (var a = [], c = this.firstChild; c; c = c.nextSibling)
                b[c.getValue()] && a.push(c);
            this.selection.set(a);
            this.change()
        },destroy: function() {
            this.inherit();
            r.remove(this)
        }});
    delete u.prototype.template;
    var j = n(l, {className: "Basis.Controls.Form.Field.RadioGroup.Item",behaviour: {select: function() {
                this.inherit();
                this.field.checked = !0;
                t(this.element).add("selected")
            },
            unselect: function() {
                this.inherit();
                this.field.checked = !1;
                t(this.element).remove("selected")
            },click: function() {
                this.select()
            },update: function(a, b) {
                this.inherit(a, b);
                this.field.value = this.valueGetter(a.info, a);
                this.titleText.nodeValue = this.titleGetter(a.info, a)
            }},template: new k('<label{element} class="item"><input{field} type="radio" class="radio"/><span{content}>{titleText}</span></label>'),init: function(a) {
            this.inherit(a);
            this.dispatch("update", this, this.info, this.info, {})
        }});
    b.RadioGroup = n(u, {className: "Basis.Controls.Form.Field.RadioGroup",
        childClass: j,fieldTemplate: new k('<div{field|childNodesElement} class="Basis-RadioGroup"></div>'),init: function(a) {
            this.inherit(a);
            h.addHandler(this.childNodesElement, "click", function(a) {
                var b = h.sender(a), c = b.tagName == "LABEL" ? b : i.parent(b, "LABEL", 0, this.field);
                if (c && c.node) {
                    if (!c.node.isDisabled()) {
                        var e = this;
                        setTimeout(function() {
                            e.dispatch("click", a, c.node);
                            c.node.dispatch("click", a)
                        }, 0)
                    }
                    h.kill(a)
                }
            }, this);
            return a
        },appendChild: function(a) {
            if (a = this.inherit(a, refChild))
                a.field.name = this.name
        },insertBefore: function(a, 
        b) {
            if (a = this.inherit(a, b))
                a.field.name = this.name
        }});
    var z = n(l, {className: "Basis.Controls.Form.Field.CheckGroup.Item",behaviour: {select: function() {
                this.inherit();
                this.field.checked = !0
            },unselect: function() {
                this.inherit();
                this.field.checked = !1
            },click: function() {
                this.selected ? this.unselect() : this.select(!0)
            },update: function(a, b) {
                this.inherit(a, b);
                this.field.value = this.valueGetter(a.info, a);
                this.titleText.nodeValue = this.titleGetter(a.info, a)
            }},template: new k('<label{element} class="item"><input{field} type="checkbox"/><span{content}>{titleText}</span></label>')});
    b.CheckGroup = n(u, {className: "Basis.Controls.Form.Field.CheckGroup",childClass: z,multipleSelect: !0,fieldTemplate: new k('<div{field|childNodesElement} class="Basis-CheckGroup"></div>'),init: function(a) {
            a = this.inherit(a);
            h.addHandler(this.childNodesElement, "click", function(a) {
                var b = h.sender(a), c = b.tagName == "LABEL" ? b : i.parent(b, "LABEL", 0, this.field);
                if (c && c.node) {
                    if (!c.node.isDisabled()) {
                        var e = this;
                        setTimeout(function() {
                            e.dispatch("click", a, c.node);
                            c.node.dispatch("click", a)
                        }, 0)
                    }
                    h.kill(a)
                }
            }, this);
            return a
        }});
    var c = n(l, {className: "Basis.Controls.Form.Field.Select.Item",behaviour: {update: function(a, b) {
                this.inherit(a, b);
                this.field.value = this.valueGetter(a.info, a);
                this.field.text = this.titleGetter(a.info, a)
            }},template: new k("<option{element|field}></option>")});
    b.Select = n(u, {className: "Basis.Controls.Form.Field.Select",childClass: c,fieldTemplate: new k("<select{field|childNodesElement}/>"),init: function(a) {
            this.inherit(a);
            h.addHandler(this.field, "change", this.change, this);
            h.addHandler(this.field, "keyup", this.change, 
            this)
        },setValue: function(a) {
            a = this.childNodes.search(a, "getValue()");
            if (this.field.selectedIndex != Array.lastSearchIndex)
                this.field.selectedIndex = Array.lastSearchIndex, this.selection.dispatch = Function.$null, a ? this.selection.add([a]) : this.selection.clear(), delete this.selection.dispatch, clearTimeout(this.selection._fireTimer), delete this.selection._fireTimer
        }});
    var g = {show: function() {
            t(this.field).add("Basis-DropdownList-Opened")
        },hide: function() {
            t(this.field).remove("Basis-DropdownList-Opened")
        },click: function(a) {
            var b = 
            h.sender(a);
            if ((b = b.tagName == "A" ? b : i.parent(b, "A", 0, this.content)) && b.node)
                b.node.isDisabled() || (this.hide(), this.dispatch("click", a, b.node), b.node.dispatch("click", a)), h.kill(a)
        }}, c = n(l, {className: "Basis.Controls.Form.Field.Combobox.Item",behaviour: {click: function() {
                this.select()
            },update: function(a, b) {
                this.inherit(a, b);
                this.titleText.nodeValue = this.titleGetter(a.info, a)
            }},template: new k('<a{element} class="item" href="#">{titleText}</a>')}), m = {focus: function() {
            t(this.caption).add("focused")
        },blur: function() {
            t(this.caption).remove("focused")
        },
        keypress: function(a) {
            var b = h.key(a), c = this.selection.pick();
            switch (b) {
                case h.KEY.DOWN:
                    if (a.altKey)
                        return this.popup.visible ? this.hide() : !this.isDisabled() ? this.show() : null;
                    c = i.axis(c ? c : this.firstChild, i.AXIS_FOLLOWING_SIBLING).search(!1, "disabled");
                    break;
                case h.KEY.UP:
                    if (a.altKey)
                        return this.popup.visible ? this.hide() : !this.isDisabled() ? this.show() : null;
                    c = c ? i.axis(c, i.AXIS_PRESCENDING_SIBLING).search(!1, "disabled") : this.firstChild;
                    break;
                case h.KEY.ENTER:
                    return this.popup.visible && this.hide(), h.kill(a)
            }
            c && 
            c.select()
        }};
    b.Combobox = n(u, {className: "Basis.Controls.Form.Field.Combobox",childClass: c,behaviour: A(b, {disable: function() {
                this.inherit();
                t(this.field).add("disabled")
            },enable: function() {
                this.inherit();
                t(this.field).remove("disabled");
                this.delegate && this.delegate.select && this.delegate.select()
            },update: function(a, b) {
                this.inherit(a, b);
                this.field.title = this.captionText.nodeValue = this.captionFormater(v(this.getTitle(), this.getValue(), ""), this.getValue())
            }}),caption: null,popup: null,property: null,selectedIndex: -1,
        captionFormater: Function.$self,fieldTemplate: new k('<div{field} class="Basis-DropdownList"><div class="Basis-DropdownList-Canvas"><div class="corner-left-top"/><div class="corner-right-top"/><div class="side-top"/><div class="side-left"/><div class="side-right"/><div class="content"/><div class="corner-left-bottom"/><div class="corner-right-bottom"/><div class="side-bottom"/></div><div class="Basis-DropdownList-Content"><a{caption} class="Basis-DropdownList-Caption" href="#"><span class="Basis-DropdownList-CaptionText">{captionText}</span></a><div class="Basis-DropdownList-Trigger"/></div><div{content|childNodesElement} class="Basis-DropdownList-PopupContent"/></div>'),
        init: function(a) {
            if (!Basis.Controls.Popup)
                throw Error("Basis.Controls.Popup required for DropDownList");
            if (a.captionFormater)
                this.captionFormater = a.captionFormater;
            var b = a.property ? a.property.value : a.value;
            delete a.value;
            var c = a.items;
            delete a.items;
            a = this.inherit(a);
            this.popup = new Basis.Controls.Popup.Popup(s({cssClassName: "Basis-DropdownList-Popup",autorotate: 1,ignoreClickFor: [this.field],thread: a.thread,content: this.childNodesElement}, a.popup));
            this.popup.addHandler(g, this);
            for (var d in m)
                h.addHandler(this.caption, 
                d, m[d], this);
            if (a.name)
                i.insert(this.field, this.hidden = i.createElement("INPUT[type=hidden][name={0}]".format(String(a.name).quote())));
            c && i.insert(this, c);
            if (a.property)
                this.property = a.property, this.property.addLink(this, this.setValue);
            if (typeof b != "undefined")
                this.defaultValue = b;
            this.setDefaultValue();
            this.dispatch("update", this, this.info);
            h.addHandler(this.field, "click", function(a) {
                this.isDisabled() || this.popup.visible ? this.hide() : this.show();
                h.kill(a)
            }, this);
            return a
        },select: function() {
            this.inherit();
            i.focus(this.caption)
        },show: function() {
            this.popup.show(this.field);
            this.select()
        },hide: function() {
            this.popup.hide()
        },getTitle: function() {
            return this.itemTitleGetter(this.info, this.delegate)
        },getValue: function() {
            return this.itemValueGetter(this.info, this.delegate)
        },setValue: function(a) {
            a instanceof C && (a = this.itemValueGetter(a.value));
            if (this.getValue() != a) {
                a = this.childNodes.search(a, "getValue()");
                if (!a || !a.disabled && this.delegate !== a) {
                    this.selectedIndex = a ? Array.lastSearchIndex : -1;
                    this.setDelegate(a);
                    a ? this.selection.set([a]) : this.selection.clear();
                    a = this.getValue();
                    if (this.hidden)
                        this.hidden.value = a;
                    this.property && this.property.set(a)
                }
                this.dispatch("change")
            }
            return this.getValue()
        },destroy: function() {
            this.property && (this.property.removeLink(this), delete this.property);
            this.popup.destroy();
            delete this.popup;
            this.inherit()
        }});
    var a = n(null, {className: "Basis.Controls.Form.ValidatorError",init: function(a, b) {
            this.field = a;
            this.message = b
        }}), p = {NO_LOCALE: "There is no locale for this error",RegExp: function(b) {
            b.constructor != 
            RegExp && (b = RegExp(b));
            return function(c) {
                var d = c.getValue();
                if (d != "" && !d.match(b))
                    return new a(c, p.LOCALE.RegExp.WRONG_FORMAT || p.NO_LOCALE)
            }
        },Required: function(b) {
            var c = b.getValue();
            if (Function.$isNull(c) || c == "")
                return new a(b, p.LOCALE.Required.MUST_BE_FILLED || p.NO_LOCALE)
        },Number: function(b) {
            var c = b.getValue();
            if (isNaN(c))
                return new a(b, p.LOCALE.Number.WRONG_FORMAT || p.NO_LOCALE)
        },Currency: function(b) {
            var c = b.getValue();
            if (isNaN(c))
                return new a(b, p.LOCALE.Currency.WRONG_FORMAT || p.NO_LOCALE);
            if (c <= 
            0)
                return new a(b, p.LOCALE.Currency.MUST_BE_GREATER_ZERO || p.NO_LOCALE)
        },Email: function(b) {
            var c = b.getValue().trim();
            if (c != "" && !c.match(/^[a-z0-9\.\-\_]+\@(([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,6}|(\d{1,3}\.){3}\d{1,3})$/i))
                return new a(b, p.LOCALE.Email.WRONG_FORMAT || p.NO_LOCALE)
        },Url: function(b) {
            var c = b.getValue().trim();
            if (c != "" && !c.match(/^(https?\:\/\/)?((\d{1,3}\.){3}\d{1,3}|([a-zA-Z][a-zA-Z\d\-]+\.)+[a-zA-Z]{2,6})(:\d+)?(\/[^\?]*(\?\S(\=\S*))*(\#\S*)?)?$/i))
                return new a(b, p.LOCALE.Url.WRONG_FORMAT || 
                p.NO_LOCALE)
        },MinLength: function(b) {
            var c = b.getValue();
            if ((Function.$isNotNull(c.length) ? c.length : String(c).length) < b.minLength)
                return new a(b, (p.LOCALE.MinLength.MUST_BE_LONGER_THAN || p.NO_LOCALE).format(b.minLength))
        },MaxLength: function(b) {
            var c = b.getValue();
            if ((Function.$isNotNull(c.length) ? c.length : String(c).length) > b.maxLength)
                return new a(b, (p.LOCALE.MaxLength.MUST_BE_SHORTER_THAN || p.NO_LOCALE).format(b.maxLength))
        }}, A = n(f, {className: "Basis.Controls.Form.Form",canHaveChildren: !1,template: new k("<form{element}/>"),
        init: function(a) {
            a = this.inherit(s({selection: !1}, a));
            if (a.target)
                this.element.target = a.target;
            if (a.action)
                this.element.action = a.action;
            if (a.enctype)
                this.element.enctype = a.enctype;
            h.addHandler(this.element, "submit", this.submit, this);
            this.setMethod(a.method);
            this.element.onsubmit = this.submit;
            this.onSubmit = a.onSubmit || Function.$false;
            this.content = new D(s({container: this.element,onSubmit: Function.$false}, a));
            return a
        },setData: function(a) {
            this.loadData(a)
        },loadData: function(a) {
            return this.content.loadData(a)
        },
        getFieldByName: function(a) {
            return this.content.getFieldByName(a)
        },getFieldById: function(a) {
            return this.content.getFieldById(a)
        },setMethod: function(a) {
            this.element.method = a ? a.toUpperCase() : "POST"
        },submit: function() {
            if (this.validate() === !0 && !this.onSubmit())
                if (this.tagName == "FORM")
                    return !1;
                else
                    this.element.submit();
            return !0
        },setDefaultState: function() {
            return this.content.setDefaultState()
        },reset: function() {
            return this.content.reset()
        },validate: function() {
            return this.content.validate()
        },serialize: function() {
            return this.content.serialize()
        },
        appendChild: function(a) {
            return this.content.appendChild(a)
        },removeChild: function(a) {
            return this.content.removeChild(a)
        },insertBefore: function(a, b) {
            return this.content.insertBefore(a, b)
        },replaceChild: function(a, b) {
            return this.content.replaceChild(a, b)
        },clear: function() {
            return this.content.clear()
        },destroy: function() {
            this.inherit()
        }}), D = n(f, {className: "Basis.Controls.Form.FormContent",canHaveChildren: !0,childClass: b,childFactory: function(a) {
            return b.create(a.type || "text", s({tableLayout: this.tableLayout}, 
            a))
        },behaviour: {disable: function() {
                this.inherit();
                for (var a = this.firstChild; a; a = a.nextSibling)
                    a.disabled || a.dispatch("disable")
            },enable: function() {
                this.inherit();
                for (var a = this.firstChild; a; a = a.nextSibling)
                    a.disabled || a.dispatch("enable")
            }},template: new k('<div{element|content|childNodesElement} class="form-content"/>'),tableTemplate: new k('<table{element} class="form-content"><tbody{content|childNodesElement}/></table>'),init: function(a) {
            if (this.tableLayout = a.tableLayout)
                this.template = this.tableTemplate;
            a = this.inherit(a);
            a.fields && i.insert(this, a.fields);
            if (a.onSubmit)
                this.onSubmit = a.onSubmit;
            return a
        },getFieldByName: function(a) {
            return this.childNodes.search(a, "name")
        },getFieldById: function(a) {
            return this.childNodes.search(a, "id")
        },serialize: function() {
            for (var a = {}, b = this.firstChild; b; b = b.nextSibling)
                b.serializable && b.name && (a[b.name] = b.getValue());
            return a
        },setData: function(a, b) {
            this.loadData(a, b)
        },loadData: function(a, b) {
            for (var c = Object.keys(a), d = this.firstChild; d; d = d.nextSibling)
                c.indexOf(d.name) != 
                -1 ? d.setValue(a[d.name]) : d.setDefaultValue(), d.setValid();
            b || this.validate()
        },setDefaultState: function() {
            this.reset()
        },reset: function() {
            for (var a = this.firstChild; a; a = a.nextSibling)
                a.setDefaultValue();
            this.dispatch("reset")
        },validate: function() {
            for (var a, b = [], c = this.firstChild; c; c = c.nextSibling)
                (a = c.validate()) && b.push(a);
            return b.length ? (b[0].field.select(), b) : !0
        },submit: function() {
            if (this.parentNode && this.parentNode.submit)
                this.parentNode.submit();
            else if (this.validate() === !0 && this.onSubmit)
                this.onSubmit(this.serialize())
        },
        destroy: function() {
            delete this.onSubmit;
            this.inherit()
        }}), y = n(y, {matchFunction: function(a, b) {
            if (!b) {
                var c = a._m || this.textNodeGetter(a);
                c.constructor != Array && (c = [c]);
                for (var d = !1, g = 0; g < c.length; g++) {
                    var f = c[g];
                    if (f) {
                        var j = !1, m = f.nodeValue.split(this.rx);
                        if (m.length > 1) {
                            if (!a._x)
                                a._x = [];
                            if (!a._m)
                                a._m = [];
                            i.replace(a._x[g] || f, a._x[g] = i.createElement("SPAN.matched", i.wrap(m, this.map)));
                            a._m[g] = f;
                            j = d = !0
                        }
                        a._x && a._x[g] && !j && (i.replace(a._x[g], a._m[g]), a._x[g] = a._m[g])
                    }
                }
                return d
            }
            if (a._x) {
                for (g = 0; g < a._x.length; g++)
                    a._x[g] && 
                    i.replace(a._x[g], a._m[g]);
                delete a._x;
                delete a._m
            }
            return !1
        },changeHandler: function(a) {
            this.rx = this.regexpGetter(a)
        },init: function(a) {
            var b = a.startPoints || "";
            this.node = a.node;
            this.textNodeGetter = w(a.textNodeGetter || "titleText");
            this.regexpGetter = typeof a.regexpGetter == "function" ? a.regexpGetter : function(a) {
                return RegExp("(" + b + ")(" + a.forRegExp() + ")", "i")
            };
            this.map = {};
            this.map[a.wrapElement || "SPAN.match"] = function(a, b) {
                return b % 3 == 2
            };
            this.inherit("", {change: this.changeHandler}, String.trim);
            a.handlers && 
            this.addHandler(a.handlers, a.thisObject)
        }}), o = {childNodesModified: function(a, b) {
            if (b.inserted)
                for (var c = 0, d; d = b.inserted[c]; c++)
                    this.matchFunction(d, this.value == "")
        }}, f = n(y, {match: function() {
            for (var a = this.node.firstChild; a; a = a.nextSibling)
                this.matchFunction(a, this.value == "")
        },changeHandler: function(a) {
            this.inherit(a);
            this.match()
        },init: function(a) {
            this.inherit(a);
            this.node.addHandler(o, this)
        }}), y = n(y, {changeHandler: function(a) {
            this.inherit(a);
            this.node.setMatchFunction(a ? this.matchFunction.bind(this) : 
            null)
        }}), H = {keyup: function() {
            this.matchFilter.set(this.field.value)
        },change: function() {
            this.matchFilter.set(this.field.value)
        }}, n = n(d, {template: new k('<div{element|content} class="Basis-MatchInput"><input{field} type="text"/></div>'),matchFilterClass: y,init: function(a) {
            a = this.inherit(a);
            this.matchFilter = new this.matchFilterClass(a.matchFilter);
            h.addHandlers(this.field, H, this);
            return a
        },destroy: function() {
            h.clearHandlers(this.field);
            this.inherit()
        }});
    Basis.namespace("Basis.Controls.Form").extend({Form: A,
        FormContent: D,Field: b,ComplexField: u,Validator: p,ValidatorError: a,ComplexFieldItem: l,RadioGroupItem: j,CheckGroupItem: z,Combobox: b.Combobox,ComboboxItem: c,Matcher: f,MatchFilter: y,MatchInput: n})
})();
(function() {
    function n(f) {
        var d = k.key(f), h = k.sender(f);
        switch (d) {
            case k.KEY.ESCAPE:
                this.closeOnEscape && this.close(0);
                break;
            case k.KEY.ENTER:
                if (i.is(h, "TEXTAREA"))
                    break;
                k.kill(f)
        }
    }
    var h = Basis.Class, i = Basis.DOM, k = Basis.Event, r = Basis.CSS, s = Basis.Cleaner, v = Basis.Html.Template, w = i.Wrapper, t = h(w.HtmlNode, {className: "Basis.Controls.Window.Blocker",captureElement: null,template: new v('<div{element} class="Basis-Blocker"><div{content} class="Basis-Blocker-Mate"/></div>'),init: function(f) {
            this.inherit(f);
            i.setStyle(this.element, 
            {display: "none",position: "absolute",top: 0,left: 0,width: "100%",height: "100%"});
            s.add(this)
        },capture: function(f, d) {
            if (this.captureElement = i.get(f || document.body))
                i.insert(this.captureElement, this.element), this.element.style.zIndex = d || 1E3, i.show(this.element)
        },release: function() {
            this.captureElement && (this.element.parentNode == this.captureElement && i.remove(this.element), delete this.captureElement, i.hide(this.element))
        },destroy: function() {
            this.release();
            this.inherit();
            s.remove(this)
        }}), h = h(w.HtmlContainer, 
    {className: "Basis.Controls.Window.Window",template: new v('<div{element|selectedElement} class="Basis-Window"><div class="Basis-Window-Canvas"><div class="corner-left-top"/><div class="corner-right-top"/><div class="side-top"/><div class="side-left"/><div class="side-right"/><div class="content"/><div class="corner-left-bottom"/><div class="corner-right-bottom"/><div class="side-bottom"/></div><div{layout} class="Basis-Window-Layout"><div class="Basis-Window-Title"><div{title} class="Basis-Window-TitleCaption"/></div><div{content|childNodesElement} class="Basis-Window-Content"/></div></div>'),
        closeOnEscape: !0,autocenter: !1,autocenter_: !1,modal: !1,closed: !0,init: function(f) {
            this.inherit(f);
            i.hide(this.element);
            if (f.modal)
                this.modal = !0;
            "title" in f && i.insert(this.title, f.title);
            if ("closeOnEscape" in f)
                this.closeOnEscape = !!f.closeOnEscape;
            var d = "genericRule-" + this.eventObjectId;
            r.cssClass(this.element).add(d);
            this.cssRule = i.Style.cssRule("." + d);
            if (f.moveable && Basis.DragDrop)
                this.dde = new Basis.DragDrop.MoveableElement({element: this.element,trigger: this.title.parentNode,fixRight: !1,fixBottom: !1,
                    handlersContext: this,handlers: {move: function() {
                            this.autocenter = !1;
                            this.element.style.margin = 0
                        },over: function() {
                            this.cssRule.setStyle(Object.slice(this.element.style, "left top".qw()));
                            i.setStyle(this.element, {top: "",left: ""})
                        }}});
            var d = Array.from(f.buttons).map(function(b) {
                return Object.complete({handler: b.handler ? b.handler.bind(this) : b.handler}, b)
            }, this), h = Object.slice(f, "buttonOk buttonCancel".qw()), t;
            for (t in h) {
                var u = h[t];
                d.push({name: t == "buttonOk" ? "ok" : "cancel",caption: u.caption || u.title || u,handlers: {click: (u.handler || 
                        this.close).bind(this)}})
            }
            if (d.length)
                this.buttonPanel = new Basis.Controls.Button.ButtonPanel({cssClassName: "Basis-Window-ButtonPlace",container: this.content,childNodes: d});
            if (!f.titleButton || f.titleButton.close !== !1)
                t = i.insert(this.title.parentNode, i.createElement("SPAN.Basis-Window-Title-ButtonPlace"), i.INSERT_BEGIN), r.cssClass(t.parentNode).add("Basis-Window-Title-ButtonPlace-Close"), i.insert(t, i.createElement({description: "A[href=#].Basis-Window-Title-CloseButton",click: new k.Handler(function(b) {
                        k.kill(b);
                        this.close(0)
                    }, this)}, i.createElement("SPAN", Basis.Controls.Popup.LOCALE ? Basis.Controls.Popup.LOCALE.BUTTON.BACK : "Close")));
            if (f.autocenter !== !1)
                this.autocenter = this.autocenter_ = !0;
            if (f.thread)
                this.thread = f.thread, this.thread.addHandler({finish: function() {
                        this.closed && i.remove(this.element)
                    }}, this);
            k.addHandler(this.element, "keypress", n, this);
            k.addHandler(this.element, "mousedown", this.activate, this);
            s.add(this)
        },setTitle: function(f) {
            i.insert(i.clear(this.title), f)
        },realign: function() {
            if (this.autocenter)
                this.element.style.margin = 
                "", this.cssRule.setStyle(this.element.offsetWidth ? {left: "50%",top: "50%",marginLeft: -this.element.offsetWidth / 2 + "px",marginTop: -this.element.offsetHeight / 2 + "px"} : {left: 0,top: 0})
        },activate: function() {
            this.select()
        },open: function(f) {
            this.closed ? (i.visibility(this.element, !1), i.show(this.element), u.appendChild(this), this.closed = !1, this.realign(), this.thread && this.thread.start(!0), this.dispatch("beforeShow", f), i.visibility(this.element, !0), this.buttonPanel && this.buttonPanel.firstChild && this.buttonPanel.firstChild.select(), 
            this.dispatch("open", f), this.dispatch("active", f)) : this.realign()
        },close: function(f) {
            if (!this.closed)
                this.thread ? this.thread.start(1) : i.remove(this.element), u.removeChild(this), this.autocenter = this.autocenter_, this.closed = !0, this.dispatch("close", f)
        },destroy: function() {
            this.dde && (this.dde.destroy(), delete this.dde);
            this.inherit();
            this.cssRule.destroy();
            delete this.cssRule;
            s.remove(this)
        }}), A = new t, u = new w.Control({id: "Basis-WindowStack",childClass: h,handlers: {childNodesModified: function() {
                r.cssClass(this.element).bool("IsNotEmpty", 
                this.firstChild);
                var f = -1;
                if (this.lastChild) {
                    for (var d = 0, h; h = this.childNodes[d]; d++)
                        h.element.style.zIndex = 2001 + d * 2, h.modal && (f = d);
                    this.lastChild.select()
                }
                f != -1 ? A.capture(this.element, 2E3 + f * 2) : A.release()
            }},selection: {handlers: {change: function() {
                    var f = this.pick(), d = u.lastChild;
                    f ? f.parentNode == u && f != d && (u.insertBefore(f), u.dispatch("childNodesModified", {})) : d && this.add([d])
                }}}});
    k.onLoad(function() {
        i.insert(document.body, u.element, i.INSERT_BEGIN);
        for (var f = u.firstChild; f; f = f.nextSibling)
            f.realign()
    });
    Basis.namespace("Basis.Controls.Window").extend({Window: h,Blocker: t,getWindowTopZIndex: function() {
            return u.childNodes.length * 2 + 2001
        }})
})();
(function() {
    var n = Basis.Class, h = Basis.DOM, i = Basis.Event, k = Basis.Html.Template, r = Function.getter, s = Basis.CSS.cssClass, v = Basis.Cleaner, w = Basis.DOM.Wrapper, t = Basis.Layout, A = Basis.EventObject.createBehaviour;
    if (!t)
        throw "Basis.Controls.Popup: Basis.Layout required";
    var u = function() {
        return Basis.Controls.Popup.LOCALE
    }, f = {VERTICAL: "V",HORIZONTAL: "H"}, d = String("LTRTRBLBLCCTRCCBCCCCCCCC"), B = {L: "LEFT",R: "RIGHT",T: "TOP",B: "BOTTOM",C: "CENTER"}, C = {LEFT: "RIGHT",RIGHT: "LEFT",TOP: "BOTTOM",BOTTOM: "TOP",CENTER: "CENTER"}, 
    y = {finish: function() {
            this.visible || (h.remove(this.element), this.dispatch("cleanup", this))
        }}, b = n(w.HtmlContainer, {className: "Basis.Controls.Popup.Popup",template: new k(Function.lazyInit(function() {
            return '<div{element|selectedElement} class="Basis-Popup"><div{closeButton} class="Basis-Popup-CloseButton"><span>' + (u() ? u().BUTTON.BACK : "Close") + '</span></div><div{content|childNodesElement} class="Basis-Popup-Content"/></div>'
        })),behaviour: {layoutChanged: function(a, b) {
                var c = (a + "-" + b.qw().slice(2, 4).join("-")).toLowerCase(), 
                d = (this.orientation + "-" + this.dir.qw().slice(2, 4).join("-")).toLowerCase();
                s(this.element).replace(c, d, this.cssLayoutPrefix)
            }},visible: !1,autorotate: !1,dir: "",defaultDir: "RIGHT BOTTOM RIGHT TOP",orientation: f.VERTICAL,hideOnAnyClick: !0,hideOnKey: !1,ignoreClickFor: [],cssLayoutPrefix: "popup-",init: function(a) {
            this.document = this;
            var a = this.inherit(a), b = "genericRule-" + this.eventObjectId;
            s(this.element).add(b);
            this.cssRule = h.Style.cssRule("." + b);
            this.ignoreClickFor = Array.from(a.ignoreClickFor);
            if (typeof a.hideOnAnyClick == 
            "boolean")
                this.hideOnAnyClick = a.hideOnAnyClick;
            if (a.hideOnKey)
                this.hideOnKey = a.hideOnKey;
            if (a.dir)
                this.defaultDir = a.dir.toUpperCase();
            this.setLayout(this.defaultDir, a.orientation);
            if (a.autorotate)
                this.autorotate = a.autorotate;
            if (a.relElement)
                this.relElement = h.get(a.relElement);
            if (a.thread)
                this.thread = a.thread, this.thread.addHandler(y, this);
            this.addEventListener("click", "click", !0);
            v.add(this);
            return a
        },click: function(a) {
            this.dispatch("click", a)
        },setLayout: function(a, b, c) {
            var d = this.dir, g = this.orientation;
            if (typeof a == "string")
                this.dir = a.toUpperCase();
            if (typeof b == "string")
                this.orientation = b;
            if (d != this.dir || g != this.orientation)
                this.dispatch("layoutChanged", g, d), c || this.realign()
        },flip: function(a) {
            var b = this.dir.qw(), a = a == f.VERTICAL;
            b[0 + a] = C[b[0 + a]];
            b[2 + a] = C[b[2 + a]];
            this.setLayout(b.join(" "))
        },rotate: function(a) {
            var b = this.dir.qw(), a = (a % 4 + 4) % 4, c = [];
            if (!a)
                return b;
            var g = b[0].charAt(0), f = b[1].charAt(0), e = d.indexOf(g + f) >> 1, g = (e & 252) + ((e & 3) + a & 3) << 1;
            c.push(B[d.charAt(g)], B[d.charAt(g + 1)]);
            g = b[2].charAt(0);
            f = b[3].charAt(0);
            e = d.indexOf(g + f) >> 1;
            a = g != "C" && f != "C" && b[0] == b[2] != (b[1] == b[3]) ? -a + 4 : a;
            g = (e & 252) + ((e & 3) + a & 3) << 1;
            c.push(B[d.charAt(g)], B[d.charAt(g + 1)]);
            return c
        },isFitToViewport: function(a) {
            if (this.visible && this.relElement) {
                var b = new t.Box(this.relElement, !1, this.element.offsetParent), c = new t.Viewport(this.element.offsetParent), d = this.element.offsetWidth, g = this.element.offsetHeight, a = String(a || this.dir).toUpperCase().qw(), e = a[0] == "CENTER" ? b.left + (b.width >> 1) : b[a[0].toLowerCase()], b = a[1] == "CENTER" ? 
                b.top + (b.height >> 1) : b[a[1].toLowerCase()];
                return (a[2] != "LEFT") * (e < d >> (a[2] == "CENTER")) || (a[2] != "RIGHT") * (c.width - e < d >> (a[2] == "CENTER")) ? !1 : (a[3] != "TOP") * (b < g >> (a[3] == "CENTER")) || (a[3] != "BOTTOM") * (c.height - b < g >> (a[3] == "CENTER")) ? !1 : {x: e,y: b}
            }
        },realign: function() {
            if (this.visible && this.relElement) {
                for (var a = this.dir.qw(), b, c = 0, d = a, g = a[2], e = a[3], f = typeof this.autorotate == "number" || !this.autorotate.length ? 3 : this.autorotate.length; this.autorotate && c <= f; ) {
                    if (b = this.isFitToViewport(d.join(" "))) {
                        g = d[2];
                        e = 
                        d[3];
                        this.setLayout(d.join(" "), null, !0);
                        break
                    }
                    if (c == f)
                        break;
                    Array.isArray(this.autorotate) ? (d = this.autorotate[c++], d = typeof d == "string" ? d.toUpperCase().split(" ") : this.rotate(d)) : d = this.rotate(++c * this.autorotate)
                }
                b || (b = new t.Box(this.relElement, !1, this.element.offsetParent), b = {x: a[0] == "CENTER" ? b.left + (b.width >> 1) : b[a[0].toLowerCase()],y: a[1] == "CENTER" ? b.top + (b.height >> 1) : b[a[1].toLowerCase()]});
                a = new t.Box(this.element.offsetParent);
                c = {left: "auto",right: "auto",top: "auto",bottom: "auto"};
                switch (g) {
                    case "LEFT":
                        c.left = 
                        b.x + "px";
                        break;
                    case "CENTER":
                        c.left = Math.round(b.x - this.element.offsetWidth / 2) + "px";
                        break;
                    case "RIGHT":
                        c.right = a.width - b.x + "px"
                }
                switch (e) {
                    case "TOP":
                        c.top = b.y + "px";
                        break;
                    case "CENTER":
                        c.top = Math.round(b.y - this.element.offsetHeight / 2) + "px";
                        break;
                    case "BOTTOM":
                        c.bottom = a.height - b.y + "px"
                }
                this.cssRule.setStyle(c);
                this.dispatch("realign")
            }
        },show: function(a, b, c, d) {
            this.relElement = h.get(a) || this.relElement;
            this.setLayout(b || this.defaultDir, c);
            if (this.visible)
                this.realign();
            else if (this.relElement)
                s(this.element).remove("pre-transition"), 
                h.visibility(this.element, !1), m.appendChild(this), this.dispatch.apply(this, ["beforeShow"].concat(d)), this.visible = !0, this.realign(), this.thread && this.thread.start(1), h.visibility(this.element, !0), s(this.element).add("pre-transition"), this.dispatch.apply(this, ["show"].concat(d))
        },hide: function() {
            if (this.visible)
                h.parentOf(document.body, this.element) && (this.thread ? this.thread.start(1) : (h.remove(this.element), this.dispatch("cleanup", this))), this.visible = !1, this.parentNode && m.removeChild(this), this.dispatch("hide")
        },
        hideAll: function() {
            m.clear()
        },destroy: function() {
            this.thread && (this.thread.removeHandler(y, this), delete this.thread);
            this.hide();
            i.removeHandler(this.element, "click", this.click, this);
            this.inherit();
            this.cssRule.destroy();
            delete this.cssRule;
            v.remove(this)
        }}), l = n(b, {className: "Basis.Controls.Popup.Balloon",cssLayoutPrefix: "mode-",template: new k(Function.lazyInit(function() {
            return '<div{element|selectedElement} class="Basis-Balloon"><div class="Basis-Balloon-Canvas"><div class="corner-left-top"/><div class="corner-right-top"/><div class="side-top"/><div class="side-left"/><div class="side-right"/><div class="content"/><div class="corner-left-bottom"/><div class="corner-right-bottom"/><div class="side-bottom"/><div class="tail"/></div><div class="Basis-Balloon-Layout"><div{closeButton} class="Basis-Balloon-CloseButton"><span>' + 
            (u() ? u().BUTTON.BACK : "Close") + '</span></div><div{content|childNodesElement} class="Basis-Balloon-Content"/></div></div>'
        }))}), j = n(w.HtmlContainer, {className: "Basis.Controls.Popup.MenuItem",childFactory: function(a) {
            return new this.childClass(a)
        },template: new k('<div{element} class="Basis-Menu-Item"><a{content|selectedElement} href="#"><span>{captionText}</span></a></div><div{childNodesElement}/>'),behaviour: {childNodesModified: function() {
                s(this.element).bool("hasSubItems", this.hasChildNodes())
            }},groupId: 0,
        caption: "[untitled]",captionGetter: r("caption"),handler: null,defaultHandler: function(a) {
            this.parentNode && this.parentNode.defaultHandler(a)
        },init: function(a) {
            if (typeof a == "object") {
                if (a.caption)
                    this.caption = a.caption;
                if (typeof a.captionGetter == "function")
                    this.captionGetter = a.captionGetter;
                if (a.groupId)
                    this.groupId = a.groupId;
                if (typeof a.handler == "function")
                    this.handler = a.handler;
                if (typeof a.defaultHandler == "function")
                    this.defaultHandler = a.defaultHandler
            }
            a = this.inherit(a);
            this.setCaption(this.caption);
            return a
        },setCaption: function(a) {
            this.caption = a;
            if (this.captionText)
                this.captionText.nodeValue = this.captionGetter(this)
        }});
    j.prototype.childClass = j;
    var z = n(j, {className: "Basis.Controls.Popup.MenuItemSet",behaviour: A(w.HtmlNode, {}),template: new k('<div{element|content|childNodesElement} class="Basis-Menu-ItemSet"/>')}), c = n(w.HtmlPartitionNode, {className: "Basis.Controls.Popup.MenuPartitionNode",defaultHandler: function() {
        },template: new k('<div{element} class="Basis-Menu-ItemGroup"><div{childNodesElement|content} class="Basis-Menu-ItemGroup-Content"></div></div>')}), 
    g = n(w.HtmlGroupControl, {className: "Basis.Controls.Popup.MenuGroupControl",childClass: c}), k = n(b, {className: "Basis.Controls.Popup.Menu",childClass: j,defaultDir: "LEFT BOTTOM LEFT TOP",subMenu: null,groupControlClass: g,localGrouping: {groupGetter: r("groupId")},defaultHandler: function() {
            this.hide()
        },behaviour: {click: function(a, b) {
                b && !b.isDisabled() && !(b instanceof z) && (b.handler ? b.handler(b) : b.defaultHandler(b), i.kill(a))
            }},template: new k(Function.lazyInit(function() {
            return '<div{element|selectedElement} class="Basis-Menu"><div{closeButton} class="Basis-Menu-CloseButton"><span>' + 
            (u() ? u().BUTTON.BACK : "Close") + '</span></div><div{content|childNodesElement} class="Basis-Menu-Content"/></div>'
        })),init: function(a) {
            a = this.inherit(a);
            if (typeof a.defaultHandler == "function")
                this.defaultHandler = a.defaultHandler;
            this.addEventListener("mouseover");
            return a
        }}), m = new (n(w.Control, {className: "Basis.Controls.Popup.PopupManager",handheldMode: !1,childClass: b,behaviour: A(w.Node, {childNodesModified: function(a, b) {
                if (b.deleted)
                    for (var c = b.deleted.length - 1, d; d = b.deleted[c]; c--)
                        d.hide();
                if (b.inserted && 
                !b.deleted && this.childNodes.length == b.inserted.length)
                    s(this.element).add("IsNotEmpty"), document.body.className = document.body.className, i.addGlobalHandler("click", this.hideByClick, this), i.addGlobalHandler("keydown", this.hideByKey, this), i.addGlobalHandler("scroll", this.hideByScroll, this), i.addHandler(window, "resize", this.realignAll, this);
                this.lastChild ? this.lastChild.select() : (s(this.element).remove("IsNotEmpty"), document.body.className = document.body.className, i.removeGlobalHandler("click", this.hideByClick, 
                this), i.removeGlobalHandler("keydown", this.hideByKey, this), i.removeGlobalHandler("scroll", this.hideByScroll, this), i.removeHandler(window, "resize", this.realignAll, this))
            }}),insertBefore: function(a, b) {
            var c = document.documentElement.scrollTop, d = document.body.scrollTop;
            if (this.inherit(a, b)) {
                a.documentST_ = c;
                a.bodyST_ = d;
                if (this.handheldMode)
                    document.documentElement.scrollTop = 0, document.body.scrollTop = 0;
                a.element.style.zIndex = Basis.Controls.Window ? Basis.Controls.Window.getWindowTopZIndex() : 2001
            }
        },removeChild: function(a) {
            if (a && 
            (a.hideOnAnyClick && a.nextSibling && this.removeChild(a.nextSibling), this.inherit(a), this.handheldMode))
                document.documentElement.scrollTop = a.documentST_, document.body.scrollTop = a.bodyST_
        },realignAll: function() {
            for (var a = this.firstChild; a; a = a.nextSibling)
                a.realign()
        },clear: function() {
            this.firstChild && this.removeChild(this.firstChild)
        },hideByClick: function(a) {
            for (var a = i.sender(a), b, c = this.childNodes.filter(Function.getter("hideOnAnyClick")).reverse(), d = 0, g; g = c[d]; d++) {
                if (a === g.closeButton || h.parentOf(g.closeButton, 
                a)) {
                    this.removeChild(g);
                    return
                }
                b || (b = h.axis(a, h.AXIS_ANCESTOR_OR_SELF));
                if (b.has(g.element) || b.some(Array.prototype.has, g.ignoreClickFor)) {
                    this.removeChild(c[d - 1]);
                    return
                }
            }
            this.removeChild(c.last())
        },hideByKey: function(a) {
            var a = i.key(a), b = this.lastChild;
            if (b && b.hideOnKey) {
                var c = !1;
                typeof b.hideOnKey == "function" ? c = b.hideOnKey(a) : Array.isArray(b.hideOnKey) && (c = b.hideOnKey.has(a));
                c && b.hide()
            }
        },hideByScroll: function(a) {
            a = i.sender(a);
            if (!h.parentOf(a, this.element))
                for (var b = this.lastChild; b; ) {
                    var c = b.previousSibling;
                    b.relElement && b.offsetParent !== a && h.parentOf(a, b.relElement) && b.hide();
                    b = c
                }
        }}))({id: "Basis-PopupStack"});
    i.onLoad(function() {
        h.insert(document.body, m.element, h.INSERT_BEGIN);
        m.realignAll()
    });
    Basis.namespace("Basis.Controls.Popup").extend({ORIENTATION: f,setHandheldMode: function(a) {
            m.handheldMode = !!a
        },Popup: b,Balloon: l,Menu: k,MenuGroupControl: g,MenuPartitionNode: c,MenuItem: j,MenuItemSet: z})
})();
(function() {
    function n() {
        if (this.selection && !this.selection.itemCount) {
            var d = this.childNodes.search(!1, "disabled");
            d && d.select()
        }
    }
    var h = Basis.Class, i = Basis.DOM, k = Basis.Html.Template, r = Basis.CSS.cssClass, s = Function.getter, v = i.Wrapper, w = h(v.HtmlControl, {className: "Basis.Controls.Tabs.AbstractTabsControl",canHaveChildren: !0,childClass: v.HtmlNode,behaviour: {childEnabled: function(d) {
                this.selection && !this.selection.itemCount && d.select()
            },childDisabled: n,childNodesModified: n},item: function(d) {
            d = isNaN(d) ? 
            this.indexOf(d) : parseInt(d);
            return d.between(0, this.childNodes.length - 1) ? this.childNodes[d] : null
        },indexOf: function(d) {
            return d instanceof this.childClass ? this.childNodes.indexOf(d) : this.childNodes.search(d, "name") ? Array.lastSearchIndex : -1
        }}), s = h(v.HtmlContainer, {className: "Basis.Controls.Tabs.Tab",canHaveChildren: !1,behaviour: {disable: function() {
                this.inherit();
                this.unselect();
                this.document && this.document.dispatch("childDisabled", this)
            },enable: function() {
                this.inherit();
                this.document && this.document.dispatch("childEnabled", 
                this)
            },click: function() {
                this.isDisabled() || this.select()
            },update: function(d, f) {
                this.inherit(d, f);
                var h = this.titleText, i = this.titleGetter(this);
                h.nodeValue = i == null || i == "" ? "[no title]" : i
            }},template: new k('<div{element|selectedElement} class="Basis-Tab"><span class="Basis-Tab-Start"/><span class="Basis-Tab-Content"><span{content} class="Basis-Tab-Caption">{titleText}</span></span><span class="Basis-Tab-End"/></div>'),titleGetter: s("info.title"),groupId: 0,init: function(d) {
            if (d) {
                if (d.name != "")
                    this.name = 
                    d.name;
                if (d.groupId != "")
                    this.groupId = d.groupId;
                d.content && (d = Object.complete({}, d), delete d.content)
            }
            this.inherit(d)
        }}), t = h(v.HtmlGroupControl, {childClass: h(v.HtmlPartitionNode, {template: new k('<div{element|content|childNodesElement} class="Basis-TabControl-TabGroup"></div>')})}), t = h(w, {className: "Basis.Controls.Tabs.TabControl",childClass: s,groupControlClass: t,template: new k('<div{element} class="Basis-TabControl"><div class="Basis-TabControl-Start"/><div{content|childNodesElement} class="Basis-TabControl-Content"/><div class="Basis-TabControl-End"/></div>'),
        init: function(d) {
            this.inherit(d);
            this.addEventListener("click", "click", !0)
        }}), A = h(v.HtmlContainer, {className: "Basis.Controls.Tabs.Page",canHaveChildren: !0,behaviour: {select: function() {
                r(this.element).remove("Basis-Page-Hidden");
                this.inherit()
            },unselect: function() {
                r(this.element).add("Basis-Page-Hidden");
                this.inherit()
            }},template: new k('<div{element} class="Basis-Page Basis-Page-Hidden"><div{content|childNodesElement} class="Basis-Page-Content"/></div>'),init: function(d) {
            if (d && d.name != "")
                this.name = 
                d.name;
            this.inherit(d)
        }}), u = h(w, {className: "Basis.Controls.Tabs.PageControl",childClass: A,template: new k('<div{element|content|childNodesElement} class="Basis-PageControl"/>')}), v = h(s, {className: "Basis.Controls.Tabs.TabSheet",canHaveChildren: !0,childClass: v.HtmlNode,behaviour: {select: function() {
                this.inherit();
                r(this.pageElement).remove("Basis-Page-Hidden")
            },unselect: function() {
                this.inherit();
                r(this.pageElement).add("Basis-Page-Hidden")
            }},template: new k('<div{element|selectedElement} class="Basis-TabSheet"><div{tabElement} class="Basis-Tab"><span class="Basis-Tab-Start"/><span class="Basis-Tab-Content"><span{content} class="Basis-Tab-Caption">{titleText}</span></span><span class="Basis-Tab-End"/></div><div{pageElement} class="Basis-Page Basis-Page-Hidden"><div{pageContent|childNodesElement} class="Basis-Page-Content"/></div></div>'),
        init: function(d) {
            var f;
            if (d && d.content)
                d = Object.complete({}, d), f = d.content, delete d.content;
            this.inherit(d);
            f && i.insert(this.pageContent, f)
        },destroy: function() {
            i.remove(this.pageElement);
            this.inherit()
        }}), f = h(t, {className: "Basis.Controls.Tabs.AccordionControl",childClass: v,template: new k('<div{element|content} class="Basis-AccordionControl"><div{content|childNodesElement} class="Basis-AccordionControl-Content"/></div>')}), h = h(t, {className: "Basis.Controls.Tabs.TabSheetControl",childClass: v,template: new k('<div{element|content} class="Basis-TabSheetControl"><div{tabsElement} class="Basis-TabControl"><div class="Basis-TabControl-Start"/><div{content|childNodesElement} class="Basis-TabControl-Content"/><div class="Basis-TabControl-End"/></div><div{pagesElement} class="Basis-PageControl"/></div>'),
        insertBefore: function(d, f) {
            if (d = this.inherit(d, f))
                return this.pagesElement && this.pagesElement.insertBefore(d.pageElement, this.nextSibling ? this.nextSibling.pageElement : null), d
        },removeChild: function(d) {
            if (d = this.inherit(d))
                return this.pagesElement && d.element.appendChild(d.pageElement), d
        },clear: function() {
            this.childNodes.forEach(function(d) {
                d.element.appendChild(d.pageElement)
            });
            this.inherit()
        }});
    Basis.namespace("Basis.Controls.Tabs").extend({AbstractTabsControl: w,TabControl: t,Tab: s,PageControl: u,Page: A,
        AccordionControl: f,TabSheetControl: h,TabSheet: v})
})();
(function() {
    function n() {
        r.axis(this, r.AXIS_DESCENDANT_OR_SELF, "expand()")
    }
    function h() {
        r.axis(this, r.AXIS_DESCENDANT_OR_SELF, "collapse()")
    }
    var i = Basis.Class, k = Basis.Event, r = Basis.DOM, s = Basis.Html.Template, v = Basis.CSS.cssClass, w = Function.getter, t = r.Wrapper, A = i(t.HtmlPartitionNode, {className: "Basis.Controls.Tree.TreePartitionNode",template: new s('<li{element} class="Basis-Tree-NodeGroup"><div class="Basis-Tree-NodeGroup-Title"><span>{titleText}</span></div><ul{childNodesElement} class="Basis-Tree-NodeGroup-Content"/></li>')}), u = 
    i(t.HtmlGroupControl, {className: "Basis.Controls.Tree.TreeGroupControl",childClass: A}), w = i(t.HtmlContainer, {className: "Basis.Controls.Tree.TreeNode",canHaveChildren: !1,behaviour: {click: function(d) {
                r(k.sender(d)).isInside(this.tmpl.title || this.tmpl.element) && this.select(k(d).ctrlKey)
            },update: function(d, f) {
                this.inherit(d, f);
                this.tmpl.titleText.data = String(this.titleGetter(this)) || "[no title]"
            }},template: new s('<li{element} class="Basis-Tree-Node"><div{content|selectedElement} class="Tree-Node-Title Tree-Node-Content"><a{title} href="#">{titleText|[no title]}</a></div></li>'),
        titleGetter: w("info.title"),expand: Function.$undef,expandAll: n,collapse: Function.$undef,collapseAll: h}), f = i(w, {className: "Basis.Controls.Tree.TreeFolder",canHaveChildren: !0,childClass: w,groupControlClass: u,behaviour: {click: function(d) {
                this.expander && r(k.sender(d)).isInside(this.tmpl.expander) ? this.toggle() : this.inherit(d)
            },expand: function() {
                v(this.tmpl.element).remove("collapsed");
                r.display(this.tmpl.childNodesElement, !0)
            },collapse: function() {
                r.display(this.tmpl.childNodesElement, !1);
                v(this.tmpl.element).add("collapsed")
            }},
        template: new s('<li{element} class="Basis-Tree-Folder"><div{content|selectedElement} class="Tree-Node-Title Tree-Folder-Content"><div{expander} class="Basis-Tree-Expander"/><a{title} href="#">{titleText|[no title]}</a></div><ul{childNodesElement}/></li>'),collapsable: !0,collapsed: !1,init: function(d) {
            this.inherit(d);
            if (d) {
                if ("collapsable" in d)
                    this.collapsable = !!d.collapsable;
                if ("collapsed" in d)
                    this.collapsed = !!d.collapsed
            }
            this.collapsed && this.collapsable && this.dispatch("collapse")
        },expand: function() {
            if (this.collapsed)
                return this.collapsed = 
                !1, this.dispatch("expand"), !0
        },collapse: function() {
            if (!this.collapsed && this.collapsable)
                return this.collapsed = !0, this.dispatch("collapse"), !0
        },toggle: function() {
            this.collapsed ? this.expand() : this.collapse()
        }}), i = i(t.Control, {className: "Basis.Controls.Tree.Tree",childClass: w,groupControlClass: u,template: new s('<div{element} class="Basis-Tree"><ul{content|childNodesElement|disabledElement} class="Basis-Tree-Root"></ul></div>'),init: function(d) {
            this.inherit(d);
            this.addEventListener("click");
            this.addEventListener("dblclick")
        },
        expandAll: n,collapseAll: h,expand: Function.$undef,collapse: Function.$undef});
    Basis.namespace("Basis.Controls.Tree").extend({Tree: i,TreeNode: w,TreeFolder: f,TreeGroupControl: u,TreePartitionNode: A})
})();
(function() {
    var n = Basis.Class, h = Basis.Event, i = Basis.DOM, k = Basis.Html.Template, r = Function.getter, s = Basis.CSS.cssClass, v = Basis.Data.Property.Property, w = i.Wrapper, t = w.HtmlNode, A = w.HtmlContainer, u = w.HtmlControl, f = w.HtmlPartitionNode, d = w.HtmlGroupControl, B = n(t, {className: "Basis.Controls.Table.HeaderCell",sorting: null,defaultOrder: !1,groupId: 0,behaviour: {click: function() {
                this.selected ? this.document && this.document.setLocalSorting(this.document.localSorting, !this.document.localSortingDesc) : this.select()
            }},
        template: new k('<th{element|selectedElement} class="Basis-Table-Header-Cell"><div class="Basis-Table-Sort-Direction"></div><div class="Basis-Table-Header-Cell-Content"><span{content} class="Basis-Table-Header-Cell-Title"></span></div></th>'),init: function(b) {
            b = b || {};
            b.selectable = !!b.sorting;
            this.inherit(b);
            if (b.groupId)
                this.groupId = b.groupId;
            if (b.sorting)
                this.sorting = r(b.sorting), this.defaultOrder = b.defaultOrder == "desc", s(this.element).add("sortable")
        },select: function() {
            if (!this.selected)
                this.order = 
                this.defaultOrder;
            this.inherit()
        }}), C = n(A, {className: "Basis.Controls.Table.Header",canHaveChildren: !0,childClass: B,childFactory: function(b) {
            return new this.childClass(b)
        },groupControlClass: n(d, {childClass: n(f, {className: "Basis.Controls.Table.HeaderPartitionNode",behaviour: {childNodesModified: function() {
                        this.element.colSpan = this.childNodes.length
                    }},template: new k('<th{element|selectedElement} class="Basis-Table-Header-Cell"><div class="Basis-Table-Sort-Direction"></div><div class="Basis-Table-Header-Cell-Content"><span{content} class="Basis-Table-Header-Cell-Title">{titleText}</span></div></th>')})}),
        template: new k('<thead{element} class="Basis-Table-Header"><tr{groupsElement} class="Basis-Table-Header-GroupContent"></tr><tr{childNodesElement|content}></tr></thead>'),init: function(b) {
            this.inherit(b);
            this.selection = new w.Selection({handlersContext: this,handlers: {change: function() {
                        var b = this.selection.pick();
                        b && this.document && this.document.setLocalSorting(b.sorting, b.order)
                    }}});
            this.document && this.document.addHandler({localSortingChanged: function() {
                    var b = this.document;
                    if (b) {
                        var c = this.childNodes.search(b.localSorting, 
                        "sorting");
                        c ? (c.select(), c.order = b.localSortingDesc, s(this.content).bool("sort-order-desc", c.order)) : this.selection.clear()
                    }
                }}, this);
            b && this.applyConfig_(b.structure);
            this.document && i.insert(this.document.element, this.element, i.INSERT_BEGIN)
        },applyConfig_: function(b) {
            if (b) {
                this.clear();
                for (var d = 0; d < b.length; d++) {
                    var c = b[d], g = c.header;
                    if (g == null || typeof g == "string")
                        g = {content: g || String.Entity.nbsp};
                    var f = g.content;
                    this.appendChild({content: typeof f == "function" ? f.call(this) : f,sorting: c.sorting,defaultOrder: c.defaultOrder,
                        groupId: c.groupId,cssClassName: {element: (g.cssClassName || "") + " " + (c.cssClassName || "")}})
                }
            }
        },destroy: function() {
            delete this.document;
            this.inherit()
        }}), y = n(t, {className: "Basis.Controls.Table.FooterCell",colSpan: 1,template: new k('<td{element} class="Basis-Table-Footer-Cell"><div{content}>' + String.Entity.nbsp + "</div></td>"),setColSpan: function(b) {
            this.element.colSpan = this.colSpan = b || 1
        }}), b = n(A, {className: "Basis.Controls.Table.Footer",childClass: y,childFactory: function(b) {
            return new this.childClass(b)
        },
        template: new k('<tfoot{element} class="Basis-Table-Footer"><tr{content|childNodesElement}></tr></tfoot>'),init: function(b) {
            b = b || {};
            this.inherit(b);
            this.applyConfig_(b.structure);
            this.useFooter && i.insert(b.container || this.document.element, this.element, 1)
        },applyConfig_: function(b) {
            if (b) {
                var d = null;
                this.clear();
                this.useFooter = !1;
                for (var c = 0; c < b.length; c++) {
                    var g = b[c], f;
                    g.footer ? (f = g.footer.content, typeof f == "object" && f instanceof v ? (this.document && typeof f.attach == "function" && f.attach(this.document), 
                    f = f.addLink(i.createText(), null, g.footer.format)) : typeof f == "function" && (f = f.call(this, this.document && this.document.registers)), this.useFooter = !0, f = this.appendChild({cssClassName: (g.cssClassName || "") + " " + (g.footer.cssClassName || ""),content: f})) : d ? d.setColSpan(d.colSpan + 1) : f = this.appendChild({});
                    f && (d = f)
                }
            }
        }}), l = n(t, {className: "Basis.Controls.Table.Row",canHaveChildren: !1,repaintCount: 0,getters: [],classNames: [],template: new k('<tr{element|content|childNodesElement} class="Basis-Table-Row"></tr>'),behaviour: {click: function(b) {
                this.select(h(b).ctrlKey)
            },
            update: function(b, d) {
                this.inherit(b, d);
                this.repaint()
            }},repaint: function() {
            this.repaintCount += 1;
            for (var b = 0, d; d = this.updaters[b]; b++) {
                var c = this.element.childNodes[d.cellIndex];
                d = d.getter.call(this, this, c);
                if (this.repaintCount > 1)
                    c.innerHTML = "";
                if (!d || !Array.isArray(d))
                    d = [d];
                for (var g = 0; g < d.length; g++) {
                    var f = d[g];
                    c.appendChild(f && f.nodeType ? f : i.createText(f != null && (typeof f != "string" || f != "") ? f : " "))
                }
            }
        }}), t = n(f, {className: "Basis.Controls.Table.Body",behaviour: {click: function() {
                s(this.element).toggle("collapsed")
            }},
        template: new k('<tbody{element|childNodesElement} class="Basis-Table-Body"><tr class="Basis-Table-GroupHeader"><td{content} colspan="100"><span class="expander"></span>{titleText}</td></tr></tbody>')}), u = n(u, {className: "Basis.Controls.Table.Table",canHaveChildren: !0,childClass: l,groupControlClass: n(d, {childClass: t}),registers: null,template: new k('<table{element|groupsElement} class="Basis-Table" cellspacing="0"><tbody{content|childNodesElement} class="Basis-Table-Body"></tbody></table>'),init: function(d) {
            d = 
            d || {};
            this.applyConfig_(d);
            this.inherit(d);
            d.registers && this.attachRegisters_(d.registers);
            this.body = this;
            this.header = new C(Object.extend({document: this,structure: d.structure}, d.header));
            this.footer = new b(Object.extend({document: this,structure: d.structure}, d.footer));
            !this.localSorting && d.structure && d.structure.search(!0, function(b) {
                return b.sorting && "autosorting" in b
            }) && (d = d.structure[Array.lastSearchIndex], this.setLocalSorting(d.sorting, d.defaultOrder == "desc"));
            this.addEventListener("click");
            this.addEventListener("contextmenu", 
            "contextmenu", !0)
        },attachRegisters_: function(b) {
            Object.iterate(this.registers, function(b, c) {
                c.detach(this)
            }, this);
            this.registers = {};
            Object.iterate(b, function(b, c) {
                typeof c.attach == "function" && (c.attach(this), this.registers[b] = c)
            }, this)
        },applyConfig_: function(b) {
            if (b && b.structure) {
                var d = b.structure, c = [], g = "";
                this.clear();
                for (var f = 0; f < d.length; f++) {
                    var a = d[f], h = a.body || {};
                    if (typeof h == "function" || typeof h == "string")
                        h = {content: h};
                    var a = [a.cssClassName || "", h.cssClassName || ""].join(" ").trim(), i = h.content;
                    g += "<td" + (h.templateRef ? h.templateRef.quote("{") : "") + (a ? ' class="' + a + '"' : "") + ">" + (typeof i == "string" ? h.content : "") + "</td>";
                    typeof i == "function" && c.push({cellIndex: f,getter: i})
                }
                this.childClass = n(l, {behaviour: b.rowBehaviour,satelliteConfig: b.rowSatellite,template: new k(l.prototype.template.source.replace("</tr>", g + "</tr>")),updaters: c})
            }
        },loadData: function(b) {
            this.setChildNodes(b.map(Function.wrapper("info")))
        },destroy: function() {
            this.attachRegisters_({});
            this.inherit();
            this.header.destroy();
            this.footer.destroy();
            delete this.header;
            delete this.footer;
            delete this.registers
        }});
    Basis.namespace("Basis.Controls.Table").extend({Table: u,Body: t,Header: C,HeaderCell: B,Row: l,Footer: b})
})();
(function() {
    function n(b, c, a) {
        return a ? z == "native" ? b.createElementNS(a, c) : b.createNode(1, c, a) : z == "native" ? b.createElement(c) : b.createNode(1, c)
    }
    function h(b, c, a, d) {
        b = z == "native" ? b.createAttributeNS(a, c) : b.createNode(2, c, a);
        b.nodeValue = d;
        return b
    }
    function i(b, c) {
        return b.setAttributeNodeNS ? b.setAttributeNodeNS(c) : b.setAttributeNode(c)
    }
    function k(c, d, a) {
        i(c, h(c.ownerDocument, b.PREFIX + (d ? ":" + d : ""), b.NAMESPACE, a))
    }
    function r(b, c) {
        return b.createTextNode(String(c))
    }
    function s(b, c) {
        return b.createCDATASection(c)
    }
    function v(b, c) {
        var a = b.nodeType, d = b.attributes, f = b.firstChild;
        if (f) {
            if (f.nodeType != B && f === b.lastChild)
                return f.nodeValue
        } else {
            var h = d && d[0];
            if (a == B) {
                if (!h)
                    return "";
                if (d.length == 1 && (h.baseName || h.localName) == l.localpart && h.namespaceURI == l.namespace)
                    return null
            } else if (!h)
                return null
        }
        var a = {}, h = [], j = 0, e, i, k;
        if (f) {
            do
                j = h.push(f);
            while (f = f.nextSibling)
        }
        if (d)
            for (f = 0; k = d[f]; f++)
                h.push(k);
        c || (c = {});
        for (var f = 0, s; s = h[f]; f++) {
            d = s.nodeName;
            e = f < j;
            k = c[d];
            if (e)
                e = v(s, c);
            else {
                if (d == "xmlns")
                    continue;
                e = s.nodeValue
            }
            for (; k; )
                if (k.storeName && 
                (e[k.storeName] = d), k.rename)
                    d = k.rename, k = c[d];
                else {
                    k.format && (e = k.format(e));
                    !a[d] && k.forceArray && (e = [e]);
                    break
                }
            d in a ? (i = a[d]) && i.push ? i.push(e) : a[d] = [i, e] : a[d] = e
        }
        return a
    }
    function w(c, d, a, f) {
        if (String(d).charAt(0) == "@")
            return f == null ? f : h(c, d.substr(1), "", String(f.content || f));
        else {
            d = n(c, d.toString(), d.namespace || a);
            if (typeof f == "undefined" || f === null)
                i(d, y.createAttribute(c, l, "true"));
            else if (typeof f == "string" || typeof f == "number" || typeof f == "function" || typeof f == "boolean" || f.constructor == Date || 
            f.constructor == RegExp)
                d.appendChild(r(c, f));
            else {
                a = f.xmlns || a;
                f.xmlns && b.BAD_SUPPORT && k(d, "", a);
                for (var j in f) {
                    var o = f[j];
                    if (!(j == "xmlns" || typeof o == "function"))
                        if (o && Array.isArray(o))
                            for (var s = 0; s < o.length; s++)
                                d.appendChild(w(c, j, a, o[s]));
                        else
                            o != null && typeof o == "object" && o.toString !== Object.prototype.toString && (o = o.toString()), (o = w(c, j, a, o)) && (o.nodeType == C ? i(d, o) : d.appendChild(o))
                }
            }
            return d
        }
    }
    function t(b, c) {
        if (b.getElementsByTagNameNS)
            return b.getElementsByTagNameNS(c.namespace, c.localpart);
        for (var a = 
        [], d = A.tag(b, c), f = 0, h; h = d[f++]; )
            h.namespaceURI == c.namespace && a.push(h);
        return a
    }
    var A = Basis.DOM, u = Basis.Class, f = Basis.Browser, d = Object.extend, B = A.ELEMENT_NODE, C = A.ATTRIBUTE_NODE, y = u(null, {className: "Basis.XML.QName",init: function(b, c, a) {
            this.localpart = b;
            if (c)
                this.namespace = c;
            if (a)
                this.prefix = a
        },toString: function() {
            return this.prefix ? this.prefix + ":" + this.localpart : this.localpart
        },equals: function(b) {
            return b instanceof y && b.localpart == this.localpart && b.namespace == this.namespace
        }});
    d(y, {fromNode: function(b) {
            return new y(b.baseName || 
            b.localName, b.namespaceURI, b.prefix)
        },createDocument: function(b) {
            return c(b.namespace, b)
        },createElement: function(b, c) {
            return n(b, c, c.namespace)
        },createAttribute: function(b, c, a) {
            return h(b, c, c.namespace, a)
        }});
    var b = {PREFIX: "xmlns",NAMESPACE: "http://www.w3.org/2000/xmlns/",BAD_SUPPORT: f.test("webkit528.16-") || f.test("opera9-")}, f = {PREFIX: "xsi",NAMESPACE: "http://www.w3.org/2001/XMLSchema-instance"}, l = new y("nil", f.NAMESPACE, f.PREFIX), j = u(null, {className: "Basis.XML.XMLElement",init: function(b) {
            this.setElement(b)
        },
        setElement: function(b) {
            this.element = b
        },qname: function() {
            return y.fromNode(this.element)
        },setAttribute: function(b, c) {
            i(this.element, y.createAttribute(this.element.ownerDocument, b, c))
        },getAttribute: function(b) {
            for (var c = 0, a; a = this.element.attributes[c++]; )
                if (b.equals(y.fromNode(a)))
                    return a;
            return null
        },hasAttribute: function(b) {
            return !!this.getAttribute(b)
        },setValue: function(b, c) {
            this.element.appendChild((c ? s : r)(this.element.ownerDocument, b))
        },getValue: function() {
            return this.element.firstChild.nodeValue
        },
        clear: function() {
            A.clear(this.element)
        },createChild: function(b) {
            b = this.element.appendChild(y.createElement(this.element.ownerDocument, b));
            return new j(b)
        },getChildren: function(b) {
            return t(this.element, b).map(function(b) {
                return new j(b)
            })
        },destroy: function() {
            delete this.element
        }}), z = "native", c = function() {
        if (typeof ActiveXObject !== "undefined")
            for (var b = ["MSXML2.DOMDocument.6.0", "MSXML2.DOMDocument.3.0"], c = 0; c < b.length; c++)
                try {
                    if (new ActiveXObject(b[c]))
                        return z = b[c], function(a, b) {
                            var c = new ActiveXObject(z);
                            c.documentElement = n(c, b, a);
                            return c
                        }
                } catch (a) {
                }
        var d = document.implementation;
        if (d && d.createDocument)
            return function(a, b) {
                var c = d.createDocument(a, b, null);
                if (c.charset && c.charset != document.charset)
                    c.charset = document.charset;
                return c
            };
        throw Error("Browser doesn't support for XML document!");
    }();
    Basis.namespace("Basis.XML").extend({XMLNS: b,XSI: f,XSD: {PREFIX: "xsd",NAMESPACE: "http://www.w3.org/2001/XMLSchema"},QName: y,XMLElement: j,getElementsByQName: t,addNamespace: k,createDocument: c,createElementNS: n,
        createAttribute: function(b, c, a) {
            b = z == "native" ? b.createAttribute(c) : b.createNode(2, c);
            b.nodeValue = a;
            return b
        },createAttributeNS: h,setAttributeNodeNS: i,removeAttributeNodeNS: function(b, c) {
            return b.removeAttributeNodeNS ? b.removeAttributeNodeNS(c) : b.removeAttributeNode(c)
        },createText: r,createCDATA: s,XML2Object: v,XML2String: function(b) {
            if (typeof XMLSerializer != "undefined")
                return (new XMLSerializer).serializeToString(b);
            if (typeof b.xml == "string")
                return b.xml;
            if (b.nodeType == A.DOCUMENT_NODE)
                b = b.documentElement;
            return A.outerHTML(b)
        },Object2XML: w})
})();
(function() {
    var n = Basis.Class, h = Basis.DOM, i = Basis.XML, k = i.QName, r = i.XMLElement, s = i.addNamespace, v = i.XML2Object, w = i.Object2XML, t = Basis.Browser.Cookies.get("DEBUG_MODE"), A = new k("encodingStyle", "http://schemas.xmlsoap.org/soap/envelope/", "s"), u = new k("Envelope", "http://schemas.xmlsoap.org/soap/envelope/", "soap"), f = new k("Header", "http://schemas.xmlsoap.org/soap/envelope/", "soap"), d = new k("Body", "http://schemas.xmlsoap.org/soap/envelope/", "soap"), B = new k("Fault", "http://schemas.xmlsoap.org/soap/envelope/", 
    "soap"), C = n(null, {className: "Basis.SOAP.Service",url: null,namespace: null,init: function(b, d) {
            this.url = b;
            this.namespace = d;
            this.methods = []
        },call: function(b, d) {
            b = this.createMethodCall(b, !1, d);
            b.transport.abort();
            b.invoke(d.header, d.body, d.callback, d.mapping)
        },createMethodCall: function(b, d, f) {
            return new y(this, new k(b, this.namespace), f, d)
        },destroy: function() {
            for (var b in this.methods)
                this.methods[b].destroy(), delete this.methods[b]
        }}), y = n(null, {className: "Basis.SOAP.ServiceCall",service: null,transport: null,
        method: null,envelope: null,body: null,init: function(c, d, f, a) {
            this.service = c;
            this.method = d;
            this.envelope = new l;
            this.url = c.url;
            this.transport = new b(d, f.callback);
            this.transport.requestHeaders = {SOAPAction: d.namespace + (!/\/$/.test(d.namespace) ? "/" : "") + d};
            this.transport.requestEnvelope = this.envelope;
            this.transport.postBody = this.envelope.element.ownerDocument;
            this.transport.url = {toString: function() {
                    return c.url
                }};
            if (a)
                f.mapping && this.transport.setMapping(f.mapping), f.callback && this.transport.setCallback(f.callback), 
                this.body = f.body || {}
        },repeatCall: function() {
            this.transport.get()
        },call: function(b) {
            return this.invoke(null, b || this.body)
        },invoke: function(b, d, f, a) {
            this.transport.abort();
            this.envelope.setBody(this.method, d);
            b && this.envelope.setHeader(b, this.method.namespace);
            f && this.transport.setCallback(f);
            a && this.transport.setMapping(a);
            this.transport.get()
        },destroy: function() {
            this.destroy = Function.$undef;
            this.transport.destroy();
            this.envelope.destroy();
            this.inherit()
        }}), b = n(Basis.Ajax.Transport, {className: "Basis.SOAP.ServiceCallTransport",
        callback: {},map: null,behaviour: {start: function() {
                if (t && window.console) {
                    var b = {}, d = [];
                    b.transport = this;
                    b.body = this.requestBody();
                    b.xmlString = i.XML2String(this.requestEnvelope.element.ownerDocument);
                    b.xml = v(this.postBody.documentElement);
                    for (var f in b.body) {
                        var a = b.body[f];
                        typeof a != "function" && d.push(f + ": " + (typeof a == "string" ? a.quote("'") : a))
                    }
                    console.log("request " + this.soapMethod + (d.length ? "(" + d.join(", ") + "):" : ":"), b)
                }
                this.callback.start && this.callback.start.call(this)
            },complete: function(b) {
                if (t && 
                window.console && Function.$defined(b.responseXML)) {
                    var d = {}, f = b.responseXML.documentElement;
                    Function.$defined(b.responseXML) && Function.$defined(f) ? (d.xmlString = i.XML2String(f), d.xmlObject = v(f), d.body = this.responseIsSuccess() ? this.responseBody(d.xmlObject) : (new l(f)).getBody().getValue()[B], d.transport = this) : d.text = b.responseText;
                    console.log("response " + this.soapMethod + ":", d)
                }
                this.callback.complete && this.callback.complete.call(this)
            },failure: function(b) {
                b = this.getRequestError(b);
                b.isSoapFailure && Basis.Ajax.TransportDispatcher.dispatch.call(this, 
                "soapfailure", b.code, b.msg);
                this.callback.failure && this.callback.failure.call(this, b.code, b.msg)
            },timeout: function() {
                this.callback.timeout && this.callback.timeout.call(this)
            },abort: function() {
                this.callback.abort && this.callback.abort.call(this)
            },success: function(b) {
                var d = this.callback.success;
                if (d && Function.$defined(b.responseXML) && Function.$defined(b.responseXML.documentElement))
                    if (this.responseEnvelope = new l(b.responseXML.documentElement), typeof d == "function") {
                        var f = v(this.responseEnvelope.element, 
                        this.map);
                        d.call(this, f, this.requestEnvelope, b)
                    } else if (b = this.responseBody())
                        if (b = b.Items ? b.Items[Object.keys(b.Items)[0]] : b[Object.keys(b)[0]], Array.isArray(d))
                            d.set(b);
                        else if (d.loadData)
                            d.loadData(b);
                        else if (d.appendChild) {
                            typeof d.clear == "function" && d.clear();
                            for (f = 0; f < b.length; f++)
                                d.appendChild(b[f])
                        }
            }},method: "POST",contentType: "text/xml",encoding: "utf-8",init: function(b) {
            this.inherit();
            this.soapMethod = b
        },setCallback: function(b) {
            if (b) {
                var d = b.failure;
                if (b.fault)
                    d = b.fault;
                this.callback = {start: b.start,
                    success: b.success || (typeof b == "function" ? b : void 0),failure: d,abort: b.abort,timeout: b.timeout,complete: b.complete !== Function.prototype.complete ? b.complete : void 0}
            } else
                this.callback = {}
        },setMapping: function(b) {
            this.map = b
        },invoke: function() {
        },requestBody: function() {
            return this.requestEnvelope.getBody().getValue()[this.soapMethod]
        },responseBody: function(b) {
            b = b ? b[d] : this.responseEnvelope.getBody().getValue();
            return b[this.soapMethod + "Response"][this.soapMethod + "Result"]
        },getRequestError: function(b) {
            var f, 
            h, a, j = !1;
            if (Function.$defined(b.responseXML) && Function.$defined(b.responseXML.documentElement)) {
                var i, l;
                try {
                    i = v(b.responseXML.documentElement), l = i[d][B]
                } catch (k) {
                    throw Error("SOAP response parse error");
                }
                if (l.faultactor)
                    a = l.faultactor;
                l.detail ? (f = l.detail.code, h = l.detail.message) : l.faultstring.match(/^\s*([a-z0-9\_]+)\s*\:(.+)$/i) ? (f = RegExp.$1, h = RegExp.$2) : (f = "UNKNOWN_ERROR", h = l.faultstring);
                j = !0
            }
            return {code: f || "TRANSPORT_ERROR",msg: h,faultactor: a,isSoapFailure: j}
        },extract: function(b) {
            return this.responseBody(b)
        }}), 
    l = n(r, {className: "Basis.SOAP.Envelope",setElement: function(b) {
            this.body = this.header = null;
            if (!b)
                b = k.createDocument(u).documentElement, s(b, i.XSI.PREFIX, i.XSI.NAMESPACE), s(b, i.XSD.PREFIX, i.XSD.NAMESPACE), i.XMLNS.BAD_SUPPORT && s(b, "soap", "http://schemas.xmlsoap.org/soap/envelope/");
            this.element = b;
            this.header = this.getHeader();
            this.body = this.getBody(!0)
        },setValue: Function.$null,getValue: Function.$null,createChild: Function.$null,createHeader: function() {
            if (!this.header)
                this.header = new j(null, this.element.ownerDocument), 
                h.insert(this.element, this.header.element, h.INSERT_BEGIN);
            return this.header
        },getHeader: function(b) {
            if (this.header)
                return this.header;
            var d = i.getElementsByQName(this.element, f)[0];
            if (d)
                return new j(d);
            if (b)
                return this.createHeader()
        },setHeader: function(b, d) {
            this.getHeader(!0).setValue(b, d)
        },appendHeader: function(b, d) {
            this.getHeader(!0).appendChild(b, d)
        },hasHeader: function() {
            return !!this.header
        },setHeaderSection: function(b, d) {
            this.getHeader(!0).setSection(b, d)
        },createBody: function() {
            if (!this.body)
                this.body = 
                new z(null, this.element.ownerDocument), h.insert(this.element, this.body.element);
            return this.body
        },getBody: function(b) {
            if (this.body)
                return this.body;
            var f = i.getElementsByQName(this.element, d)[0];
            if (f)
                return new z(f);
            if (b)
                return this.createBody()
        },setBody: function(b, d, f) {
            this.getBody(!0).setValue(b, d, f)
        },hasBody: function() {
            return !!this.body
        },destroy: function() {
            delete this.header;
            delete this.body;
            this.inherit()
        }}), j = n(r, {className: "Basis.SOAP.EnvelopeHeader",init: function(b, d) {
            this.inherit(b || k.createElement(d, 
            f))
        },getValue: function() {
            return v(this.element)
        },setValue: function(b, d) {
            this.clear();
            this.appendChild(b, d)
        },appendChild: function(b, d) {
            if (b)
                for (var f in b) {
                    var a = this.element.appendChild(w(this.element.ownerDocument, f, d, b[f]));
                    i.XMLNS.BAD_SUPPORT && s(a, "", d)
                }
        },setSection: function(b, d) {
            var f = i.getElementsByQName(this.element, b)[0];
            f && h.remove(f);
            this.appendChild(Function.wrapper(b)(d), b.namespace)
        }}), z = n(r, {className: "Basis.SOAP.EnvelopeBody",init: function(b, f) {
            this.inherit(b || k.createElement(f, d))
        },
        getValue: function() {
            return v(this.element)
        },setValue: function(b, d, f) {
            this.clear();
            this.appendChild(b, d, f)
        },appendChild: function(b, d, f) {
            d = Function.$defined(d) ? new r(this.element.appendChild(w(this.element.ownerDocument, b, b.namespace, d))) : this.createChild(b);
            i.XMLNS.BAD_SUPPORT && s(d.element, "", b.namespace);
            f && d.setAttribute(A, f)
        }});
    Basis.namespace("Basis.SOAP").extend({Service: C,ServiceCall: y,ServiceCallTransport: b,Envelope: l,EnvelopeHeader: j,EnvelopeBody: z})
})();
(function() {
    function n(h, i) {
        var k = Date.now() - h;
        return k >= i ? 1 : k / i
    }
    var h = Basis.Class, i = Basis.DOM, k = h(Basis.Data.Property.Property, {className: "Basis.Animation.Thread",duration: 1E3,interval: 50,startTime: 0,timer: null,started: !1,behaviour: {change: function(h, i) {
                h == 0 && this.dispatch("start");
                this.inherit(h, i);
                h == 1 && this.dispatch("finish")
            }},init: function(h) {
            h = h || {};
            this.inherit();
            if (h.duration)
                this.duration = h.duration;
            if (h.interval)
                this.interval = h.interval;
            this.run = this.run.bind(this);
            return h
        },start: function(h) {
            this.started ? 
            h && this.invert() : (this.startTime = Date.now(), this.started = !0, this.run())
        },run: function() {
            clearTimeout(this.timer);
            if (this.started) {
                var h = n(this.startTime, this.duration);
                h >= 1 ? this.stop() : (this.set(h), this.timer = setTimeout(this.run, this.interval))
            }
        },invert: function() {
            this.dispatch("invert");
            if (this.started) {
                var h = n(this.startTime, this.duration);
                this.startTime = Date.now() - this.duration * (1 - h);
                this.run()
            }
        },stop: function() {
            clearTimeout(this.timer);
            if (this.started)
                this.started = !1, this.set(1)
        },destroy: function() {
            this.stop();
            this.clear();
            this.inherit()
        }}), r = h(null, {className: "Basis.Animation.Modificator",thread: null,setter: Function.$null,notRevert: !1,timeFunction: Function.$self,init: function(h, i, n, t, r) {
            this.thread = h instanceof k ? h : new k(h);
            this.setRange(n, t);
            this.setter = i;
            this.notInvert = r;
            this.thread.addHandler({start: function() {
                },invert: function() {
                    this.start += this.range;
                    this.range *= -1
                },change: function(h) {
                    this.setter(this.start + this.range * this.timeFunction(h))
                },finish: function() {
                    this.notInvert || (this.start += this.range, 
                    this.range *= -1)
                },destroy: this.destroy}, this)
        },setRange: function(h, i) {
            this.start = h;
            this.range = i - h
        },destroy: function() {
            delete this.thread
        }});
    Basis.namespace("Basis.Animation").extend({Thread: k,Modificator: r,FX: {CSS: {FadeIn: function(h, k) {
                    return new r(h, function(h) {
                        i.setStyle(k, {opacity: h})
                    }, 0, 1)
                },FadeOut: function(h, k) {
                    return new r(h, function(h) {
                        i.setStyle(k, {opacity: h})
                    }, 1, 0)
                }}}})
})();
(function() {
    var n = Basis.Class, h = Basis.DOM, i = Basis.Browser.is("ie"), k = n(null, {className: "Basis.Flash.SWFObject",init: function(k, n) {
            delete k.classid;
            if (i) {
                n.movie = k.data;
                delete k.data;
                var v = h.createElement("");
                v.innerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ' + Object.iterate(k, String.format, '{0}="{1}"').join(" ") + ">" + Object.iterate(n, String.format, '<param name="{0}" value="{1}">').join("") + "</object>";
                this.element = v.firstChild;
                if (!this.element.id)
                    this.element.id = this.element.uniqueID
            } else
                delete n.movie, 
                h.insert(this.element = h.createElement('OBJECT[type="application/x-shockwave-flash"]' + Object.iterate(k, String.format, '[{0}="{1}"]').join("")), Object.iterate(n, function(i, k) {
                    return h.createElement("PARAM[name={0}][value={1}]".format(i, String(k).quote()))
                }))
        }}), n = n(null, {className: "Basis.Flash.SWFElement",init: function(i, n, v, w) {
            this.inherit();
            w = Object.complete({data: i}, w);
            n = Object.extend({}, n);
            if (v)
                n.flashvars = Object.iterate(v, String.format, "{0}={1}").join("&");
            this.swf = new k(w, n);
            this.element = h.createElement("", 
            this.swf.element)
        },alive: function() {
            if (i && h.parentOf(document.documentElement, this.element))
                this.element.innerHTML = this.element.innerHTML.replace(/(<param[^>]+>)+/gi, Array.from(this.swf.element.childNodes).map(function(h) {
                    return h.outerHTML
                }).join("")), this.swf.element = window[this.swf.element.id]
        },callMethod: function(i) {
            if (h.parentOf(document.documentElement, this.element))
                return (new Function("swf", "a", "b", "c", "return swf.element." + i + "(" + ["a", "b", "c"].splice(0, arguments.length - 1) + ")"))(this.swf, arguments[1], 
                arguments[2], arguments[3])
        }});
    Basis.namespace("Basis.Flash").extend({SWFElement: n,SWFObject: k})
})();
(function() {
    var n = Basis.Class, h = Basis.DOM, i = Basis.Html.Template, k = Function.getter, r = Basis.EventObject.createBehaviour, s = Basis.DOM.Wrapper, v = Basis.Data.STATE, w = new i('<div{element|content} class="Basis-Label-State"/>'), t = new i('<div{element|content} class="Basis-Label-Processing"/>'), s = n(s.HtmlNode, {className: "Basis.Controls.Label.NodeLabel",cascadeDestroy: !0,show_: !1,visible_: !1,visibilityGetter: Function.$false,insertPoint: h.INSERT_END,defaultContent: "[no text]",behaviour: {delegateChanged: function(b, 
            d) {
                (d ? d.element == this.container : !this.container) && this.setContainer(this.delegate && this.delegate.element)
            }},init: function(b) {
            b = b || {};
            if (b.container)
                this.container = b.container, delete b.container;
            if (!b.content)
                b.content = this.defaultContent;
            if (b.visibilityGetter)
                this.visibilityGetter = k(b.visibilityGetter);
            if (b.insertPoint)
                this.insertPoint = b.insertPoint;
            b = this.inherit(b);
            this.traceChanges_();
            return b
        },traceChanges_: function() {
            this.container && this.visible_ ? this.container != this.element.parentNode && h.insert(this.container, 
            this.tmpl.element, this.insertPoint) : h.remove(this.element)
        },setContainer: function(b) {
            if (this.container != b)
                this.container = b, this.traceChanges_()
        },setVisibility: function(b) {
            if (this.visible_ != b)
                this.visible_ = b, this.traceChanges_(), this.dispatch("visibilityChanged", this.visible_)
        },destroy: function() {
            delete this.container;
            this.inherit()
        }}), A = n(s, {className: "Basis.Controls.Label.State",behaviour: {stateChanged: function(b, d) {
                this.setVisibility(this.visibilityGetter(this.state, d))
            }},template: w,init: function(b) {
            if (b && 
            b.visibleStates && !b.visibilityGetter) {
                for (var d = {}, f, h = 0; f = b.visibleStates[h++]; )
                    d[f] = !0;
                b.visibilityGetter = k(Function.$self, d)
            }
            return this.inherit(b)
        }}), u = n(A, {className: "Basis.Controls.Label.Processing",visibilityGetter: function(b) {
            return b == v.PROCESSING
        },defaultContent: "Processing...",template: t}), f = {stateChanged: function(b, d) {
            this.setVisibility(this.visibilityGetter(b.state, d))
        }}, d = {collectionChanged: function(b, d) {
            d && d.removeHandler(f, this);
            b.collection && (b.collection.addHandler(f, this), f.stateChanged.call(this, 
            b.collection, b.collection.state))
        }}, r = n(A, {className: "Basis.Controls.Label.CollectionState",behaviour: r(s, {delegateChanged: function(b, f) {
                this.inherit(b, f);
                f && f.removeHandler(d, this);
                this.delegate && (this.delegate.addHandler(d, this), d.collectionChanged.call(this, this.delegate, f && f.collection))
            }}),template: w}), t = n(r, {className: "Basis.Controls.Label.CollectionProcessing",visibilityGetter: function(b) {
            return b == v.PROCESSING
        },defaultContent: "Processing...",template: t}), B = function() {
        this.setVisibility(this.visibilityGetter(this.delegate ? 
        this.delegate.childNodes.length : 0, this.delegate))
    }, C = {stateChanged: function(b) {
            this.setVisibility(this.visibilityGetter(b.itemCount, this.delegate))
        }}, y = {childNodesModified: B,collectionStateChanged: B,stateChanged: B,collectionChanged: function(b, d) {
            d && d.removeHandler(C, this);
            b.collection && (b.collection.addHandler(C, this), C.stateChanged.call(this, b.collection, b.collection.state))
        }}, i = n(s, {className: "Basis.Controls.Label.ChildCount",behaviour: {delegateChanged: function(b, d) {
                this.inherit(b, d);
                d && d.removeHandler(y, 
                this);
                this.delegate && (this.delegate.addHandler(y, this), y.collectionChanged.call(this, this.delegate));
                B.call(this)
            }},template: new i('<div{element|content} class="Basis-CountLabel"/>')}), n = n(i, {className: "Basis.Controls.Label.IsEmpty",visibilityGetter: function(b, d) {
            var f = d.collection ? d.collection.state : d.state;
            return !b && f == v.READY
        },defaultContent: "Empty"});
    Basis.namespace("Basis.Controls.Label").extend({NodeLabel: s,State: A,Processing: u,CollectionState: r,CollectionProcessing: t,ChildCount: i,IsEmpty: n})
})();
(function(n) {
    function h(h) {
        return (100 * h).toFixed(4) + "%"
    }
    var i = n.Class, k = n.DOM, r = n.Event, s = n.Html.Template, v = n.DOM.Wrapper, w = i(v.HtmlNode, {className: "Basis.Plugin.PaginatorNode",template: new s('<td{element} class="Basis-PaginatorNode"><span><a{link|selectedElement} href="#">{pageNumber}</a></span></td>'),behaviour: {update: function(h, i) {
                this.inherit(h, i);
                this.pageNumber.nodeValue = this.info.pageNumber + 1;
                this.link.href = this.urlGetter(this.info.pageNumber)
            }},urlGetter: Function.$self}), i = i(v.Control, {className: "Basis.Plugin.Paginator",
        childClass: w,template: new s('<table{element} class="Basis-Paginator"><tbody><tr{childNodesElement}></tr><tr{scrollbarContainer}><td colspan{spanAttr}="1"><div{scrollbar} class="Basis-Paginator-Scrollbar"><div{activePageMark} class="ActivePage"></div><div{scrollTrumb} class="Slider"><span/></div></div></td></tr></tbody></table>'),behaviour: {click: function(i, k) {
                if (k)
                    this.setActivePage(k.info.pageNumber);
                else {
                    var u = r.sender(i);
                    if (u == this.scrollbar)
                        u = (r.mouseX(i) - (new n.Layout.Box(u)).left - this.scrollTrumb.offsetWidth / 
                        2) / u.offsetWidth, this.scrollTrumb.style.left = h(u), this.setSpanStartPage(Math.round(u / this.pageWidth_), !0)
                }
                r.kill(i)
            },childNodesModified: function() {
                this.spanAttr.nodeValue = this.childNodes.length
            },activePageChanged: function() {
                this.updateSelection()
            }},pageSpan_: 0,pageCount_: 0,activePage_: 0,spanStartPage_: -1,pageWidth_: 0,init: function(i) {
            i = this.inherit(i);
            this.setProperties(i.pageCount || 0, i.pageSpan);
            this.setActivePage((i.activePage || 1) - 1, !0);
            this.scrollbarDD = new n.DragDrop.DragDropElement({element: this.scrollTrumb,
                handlersContext: this,handlers: {start: function() {
                        this.ddPos = this.scrollTrumb.offsetLeft
                    },move: function(i) {
                        i = ((this.ddPos + i.deltaX) / this.scrollTrumb.offsetParent.offsetWidth).fit(0, 1 - parseInt(this.scrollTrumb.style.width) / 100);
                        this.scrollTrumb.style.left = h(i);
                        this.setSpanStartPage(Math.round(i / this.pageWidth_), !0)
                    }}});
            this.addEventListener("click");
            return i
        },setProperties: function(i, n, u) {
            n = Math.min(n || 10, i);
            if (n != this.pageSpan_)
                this.pageSpan_ = n, this.setChildNodes(Array.create(n, function(f) {
                    return {info: {pageNumber: f}}
                }));
            this.pageWidth_ = 1 / (i || 1);
            if (this.pageCount_ != i)
                this.pageCount_ = i, this.activePageMark.style.width = h(this.pageWidth_), this.dispatch("pageCountChanged", this.pageCount_);
            this.scrollTrumb.style.width = h(n / (i || 1));
            k.display(this.scrollbarContainer, n < i);
            this.setSpanStartPage(this.spanStartPage_);
            this.setActivePage(arguments.length == 3 ? u : this.activePage_)
        },setActivePage: function(i, k) {
            i = i.fit(0, this.pageCount_ - 1);
            if (i != this.activePage_)
                this.activePage_ = Number(i), this.dispatch("activePageChanged", i);
            this.activePageMark.style.left = 
            h(i * this.pageWidth_);
            k && this.setSpanStartPage(this.activePage_ - Math.round(this.pageSpan_ / 2) + 1)
        },setSpanStartPage: function(i, k) {
            i = i.fit(0, this.pageCount_ - this.pageSpan_);
            if (i != this.spanStartPage_) {
                this.spanStartPage_ = i;
                for (var n = 0, f; f = this.childNodes[n]; n++)
                    f.update({pageNumber: i + n});
                this.updateSelection()
            }
            if (!k)
                this.scrollTrumb.style.left = h(i / (this.pageCount_ || 1))
        },updateSelection: function() {
            var h = this.childNodes.binarySearch(this.activePage_, "info.pageNumber");
            h != -1 ? this.childNodes[h].select() : this.selection.clear()
        },
        destroy: function() {
            this.scrollbarDD.destroy();
            delete this.scrollbarDD;
            this.inherit()
        }});
    n.namespace("Basis.Plugin").extend({Paginator: i})
})(Basis);
(function() {
    var n = Basis.Class, h = Basis.DOM, i = Basis.Event, k = Basis.Html.Template, r = Basis.DOM.Wrapper, s = n(r.HtmlNode, {template: new k('<div{element} class="XControl-Item-Header"><span>{titleText}</span></div>'),titleGetter: Function.getter("info.title"),behaviour: {update: function(h, i) {
                this.inherit(h, i);
                this.titleText.nodeValue = this.titleGetter(this) || "[no title]"
            }},init: function(h) {
            this.inherit(h);
            i.addHandler(this.element, "click", function() {
                this.owner && this.owner.parentNode && this.owner.parentNode.scrollToNode(this.owner)
            }, 
            this)
        }}), v = n(r.HtmlContainer, {template: new k('<div{element} class="XControl-Item"><span{header}/><div{content|childNodesElement} class="XControl-Item-Content"/></div>'),satelliteConfig: {header: {delegate: Function.$self,instanceOf: s}}}), w = !0, t = n(r.HtmlContainer, {behaviour: {click: function(h, i) {
                i && i.delegate.parentNode.scrollToNode(i.delegate)
            }},init: function(h) {
            this.inherit(h);
            this.document = this;
            w && i.addHandler(this.element, "mousewheel", function(h) {
                try {
                    this.owner.content.dispatchEvent(h)
                } catch (f) {
                    w = 
                    !1, i.removeHandler(this.element, "mousewheel")
                }
            }, this);
            this.addEventListener("click")
        }}), n = n(r.Control, {className: "Basis.Plugin.X.Control",childClass: v,template: new k('<div{element} class="XControl"><div{content|childNodesElement} class="XControl-Content"/></div>'),behaviour: {childNodesModified: function() {
                this.recalc()
            }},clientHeight_: -1,scrollHeight_: -1,scrollTop_: -1,lastTopPoint: -1,lastBottomPoint: -1,isFit: !0,init: function(k) {
            this.inherit(Object.complete({childNodes: null}, k));
            var n = this.childClass.prototype.satelliteConfig.header.instanceOf;
            this.meterHeader = new n({container: this.element,info: {title: "meter"}});
            this.meterElement = this.meterHeader.element;
            h.Style.setStyle(this.meterElement, {position: "absolute",visibility: "hidden"});
            this.childNodesDataset = new r.ChildNodesDataset(this);
            this.header = new t({container: this.element,childClass: n,collection: this.childNodesDataset,cssClassName: "XControlHeader"});
            this.footer = new t({container: this.element,childClass: n,collection: this.childNodesDataset,cssClassName: "XControlFooter"});
            h.hide(this.header.element);
            h.hide(this.footer.element);
            this.header.owner = this;
            this.footer.owner = this;
            this.thread = new Basis.Animation.Thread({duration: 400,interval: 15});
            this.thread.addHandler({finish: function() {
                    this.callback && this.callback()
                }});
            var f = this;
            this.modificator = new Basis.Animation.Modificator(this.thread, function(d) {
                f.content.scrollTop = parseInt(d);
                f.recalc()
            }, 0, 0, !0);
            this.modificator.timeFunction = function(d) {
                return Math.sin(Math.acos(1 - d))
            };
            i.addHandler(this.content, "scroll", this.recalc, this);
            i.addHandler(window, 
            "resize", this.recalc, this);
            this.addEventListener("click", "click", !0);
            k.childNodes && this.setChildNodes(k.childNodes);
            this.timer_ = setInterval(function() {
                f.recalc()
            }, 500)
        },scrollToNode: function(i, k) {
            if (i && i.parentNode === this) {
                var f = Math.min(this.content.scrollHeight - this.content.clientHeight, this.topPoints[h.index(i)]) || 0;
                if (this.thread) {
                    var d = this.content.scrollTop;
                    this.modificator.setRange(d, d);
                    this.thread.stop();
                    this.modificator.setRange(d, f);
                    d != f ? (this.thread.duration = Math.max(Math.round(400 * Math.abs(f - 
                    d) / this.content.scrollHeight), 200), this.thread.callback = k, this.thread.start()) : k && k()
                } else
                    this.content.scrollTop = f, k && k()
            }
        },recalc: function() {
            var i = this.content, k = i.clientHeight, f = i.scrollHeight, i = i.scrollTop, d = k == f;
            if (this.clientHeight_ != k || this.scrollHeight_ != f) {
                this.clientHeight_ = k;
                this.scrollHeight_ = f;
                var f = [], n = [];
                if (!d)
                    for (var r = this.meterElement.offsetHeight, s = 0, k = r * this.childNodes.length - k, b, l = 0; b = this.childNodes[l]; l++)
                        b = b.element.offsetTop, f.push(b ? b - s : f[l - 1] || 0), n.push(b ? b + k : n[l - 1] || k), 
                        s += r, k -= r;
                this.topPoints = f;
                this.bottomPoints = n;
                this.lastBottomPoint = this.lastTopPoint = this.scrollTop_ = -1
            }
            if (this.isFit != d)
                this.isFit = d, h.display(this.header.element, !d), h.display(this.footer.element, !d);
            if (!d && this.scrollTop_ != i)
                if (this.scrollTop_ = i, d)
                    this.lastTopPoint = 0, this.lastBottomPoint = this.childNodes.length;
                else {
                    var j = this.topPoints.binarySearchPos(i), t = this.bottomPoints.binarySearchPos(i);
                    if (this.lastTopPoint != j)
                        this.lastTopPoint = j, this.header.childNodes.forEach(function(b, d) {
                            b.element.style.display = 
                            d >= j ? "none" : ""
                        });
                    if (this.lastBottomPoint != t)
                        this.lastBottomPoint = t, this.footer.childNodes.forEach(function(b, d) {
                            b.element.style.display = d < t ? "none" : ""
                        })
                }
        },destroy: function() {
            clearInterval(this.timer_);
            this.thread.destroy();
            this.modificator.destroy();
            this.header.destroy();
            this.footer.destroy();
            this.childNodesDataset.destroy();
            i.removeHandler(this.content, "scroll", this.recalc, this);
            i.removeHandler(window, "resize", this.recalc, this);
            this.inherit()
        }});
    Basis.namespace("Basis.Plugin.X").extend({Control: n,
        ControlItem: v,ControlItemHeader: s,ControlHeaderList: t})
})();
(function() {
    var n = Basis.Class, h = Basis.Event, i = Basis.DOM, k = Function.getter, r = Basis.CSS.cssClass, s = h.addGlobalHandler, v = h.removeGlobalHandler, w = Basis.EventObject, t = Basis.Layout, A = Basis.Browser.is("IE9-"), u, f = {start: function(d) {
            u && f.over();
            u = {dde: this,run: !1,event: {initX: h.mouseX(d),initY: h.mouseY(d),deltaX: 0,deltaY: 0}};
            s("mousemove", f.move, u);
            s("mouseup", f.over, u);
            s("mousedown", f.over, u);
            h.cancelDefault(d)
        },move: function(d) {
            var f = u.dde;
            if (!u.run)
                u.run = !0, f.draging = !0, f.dispatch("start", u.event);
            if (f.axisX)
                u.event.deltaX = 
                f.axisXproxy(h.mouseX(d) - u.event.initX);
            if (f.axisY)
                u.event.deltaY = f.axisYproxy(h.mouseY(d) - u.event.initY);
            f.dispatch("move", u.event)
        },over: function() {
            var d = u.dde;
            v("mousemove", f.move, u);
            v("mouseup", f.over, u);
            v("mousedown", f.over, u);
            d.draging = !1;
            u.run && d.dispatch("over", u.event);
            u = null
        }}, k = n(w, {className: "Basis.DragDrop.DragDropElement",containerGetter: k("element"),element: null,trigger: null,baseElement: null,fixTop: !0,fixRight: !0,fixBottom: !0,fixLeft: !0,axisX: !0,axisY: !0,axisXproxy: Function.$self,axisYproxy: Function.$self,
        init: function(d) {
            this.inherit(d);
            if (typeof d == "object") {
                for (var f = "fixLeft,fixRight,fixTop,fixBottom,axisX,axisY".split(","), h = 0; h < f.length; h++)
                    f[h] in d && (this[f[h]] = !!d[f[h]]);
                if (typeof d.axisXproxy == "function")
                    this.axisXproxy = d.axisXproxy;
                if (typeof d.axisYproxy == "function")
                    this.axisYproxy = d.axisYproxy;
                if (typeof d.containerGetter == "function")
                    this.containerGetter = d.containerGetter;
                this.setElement(d.element, d.trigger);
                this.setBase(d.baseElement)
            }
            Basis.Cleaner.add(this)
        },setElement: function(d, k) {
            d = 
            d && i.get(d);
            k = k && i.get(k) || d;
            if (this.trigger != k && (this.trigger && (h.removeHandler(this.trigger, "mousedown", f.start, this), A && h.removeHandler(this.trigger, "selectstart", f.start, this)), this.trigger = k))
                h.addHandler(this.trigger, "mousedown", f.start, this), A && h.addHandler(this.trigger, "selectstart", f.start, this);
            if (this.element != d)
                this.element && r(this.element).remove("Basis-Dragable"), (this.element = d) && r(this.element).add("Basis-Dragable")
        },setBase: function(d) {
            this.baseElement = i.get(d) || (Basis.Browser.is("IE7-") ? 
            document.body : document.documentElement)
        },isDraging: function() {
            return !!(u && u.dde == this)
        },start: function(d) {
            this.isDraging() || f.start.call(this, d)
        },stop: function() {
            this.isDraging() && f.over()
        },destroy: function() {
            Basis.Cleaner.remove(this);
            this.stop();
            this.inherit();
            this.setElement();
            this.setBase()
        }}), n = n(k, {behaviour: {start: function(d) {
                var f = this.containerGetter(this, d.initX, d.initY);
                if (f) {
                    var h = new t.Box(f), i = new t.Viewport(this.baseElement);
                    r(f).add("Basis-DragDrop-DragElement");
                    d.element = f;
                    d.box = 
                    h;
                    d.viewport = i
                } else
                    console.warn("sdfsf")
            },move: function(d) {
                if (d.element) {
                    if (this.axisX) {
                        var f = d.box.left + d.deltaX;
                        this.fixLeft && f < 0 ? f = 0 : this.fixRight && f + d.box.width > d.viewport.width && (f = d.viewport.width - d.box.width);
                        d.element.style.left = f + "px"
                    }
                    if (this.axisY)
                        f = d.box.top + d.deltaY, this.fixTop && f < 0 ? f = 0 : this.fixBottom && f + d.box.height > d.viewport.height && (f = d.viewport.height - d.box.height), d.element.style.top = f + "px"
                }
            },over: function(d) {
                d.element && r(d.element).remove("Basis-DragDrop-DragElement")
            }}});
    Basis.namespace("Basis.DragDrop").extend({DragDropElement: k,
        MoveableElement: n})
})();
