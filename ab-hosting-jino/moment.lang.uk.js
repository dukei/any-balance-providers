(function () {
    function e(e) {
        function n(e, n) {
            var r = e.split("_"),
                i = Math.min(t.length, r.length),
                s = -1;
            while (++s < i) if (t[s](n)) return r[s];
            return r[i - 1]
        }
        function r(e, t, r) {
            var i = {
        'mm': 'хвилина_хвилини_хвилин_хвилини',
        'hh': 'година_години_годин_години',
        'dd': 'день_дня_днів_дня',
        'MM': 'місяць_місяця_місяців_місяця',
        'yy': 'рік_року_років_року'
            };
            return r === "m" ? t ? 'хвилина' : 'хвилину' : e + " " + n(i[r], +e)
        }
        function i(e, t) {
            var n = {
        'nominative': 'січень_лютий_березень_квітень_травень_червень_липень_серпень_вересень_жовтень_листопад_грудень'.split('_'),
        'accusative': 'січня_лютого_березня_квітня_травня_червня_липня_серпня_вересня_жовтня_листопада_грудня'.split('_')
            }, r = /D[oD]? *MMMM?/.test(t) ? "accusative" : "nominative";
            return n[r][e.month()]
        }
        function s(e, t) {
            var n = {
        'nominative': 'неділя_понеділок_вівторок_середа_четвер_п’ятниця_субота'.split('_'),
        'accusative': 'неділю_понеділок_вівторок_середу_четвер_п’ятницю_суботу'.split('_')
            }, r = /\[ ?[Вв] ?(?:попередню|наступну)? ?\] ?dddd/.test(t) ? "accusative" : "nominative";
            return n[r][e.day()]
        }
        var t = [function (e) {
            return e % 10 === 1 && e % 100 !== 11
        }, function (e) {
            return e % 10 >= 2 && e % 10 <= 4 && e % 10 % 1 === 0 && (e % 100 < 12 || e % 100 > 14)
        }, function (e) {
            return e % 10 === 0 || e % 10 >= 5 && e % 10 <= 9 && e % 10 % 1 === 0 || e % 100 >= 11 && e % 100 <= 14 && e % 100 % 1 === 0
        }, function (e) {
            return !0
        }];
        e.lang("uk", {
            months: i,
    monthsShort : "січ_лют_бер_кві_тра_чер_лип_сер_вер_жов_лис_гру".split("_"),
            weekdays: s,
    weekdaysShort : "нед_пон_вів_срд_чет_птн_суб".split("_"),
    weekdaysMin : "нд_пн_вт_ср_чт_пт_сб".split("_"),
            longDateFormat: {
                LT: "HH:mm",
                L: "DD.MM.YYYY",
                LL: "D MMMM YYYY \u0433.",
                LLL: "D MMMM YYYY \u0433., LT",
                LLLL: "dddd, D MMMM YYYY \u0433., LT"
            },
    calendar : {
        sameDay: '[Сьогодні в] LT',
        nextDay: '[Завтра в] LT',
        lastDay: '[Вчора в] LT',
        nextWeek: function () {
            return this.day() === 2 ? '[У] dddd [в] LT' : '[В] dddd [в] LT';
        },
        lastWeek: function () {
            switch (this.day()) {
            case 0:
            case 3:
            case 5:
            case 6:
                return '[В минулу] dddd [в] LT';
            case 1:
            case 2:
            case 4:
                return '[В минулий] dddd [в] LT';
            }
        },
        sameElse: 'L'
    },
            relativeTime: {
        future : "через %s",
        past : "%s тому",
        s : "декілька секунд",
                m: r,
                mm: r,
                h: "годину",
                hh: r,
                d: "день",
                dd: r,
                M: "місяць",
                MM: r,
                y: "рік",
                yy: r
            },
            ordinal: function (e) {
                return "."
            },
            week: {
                dow: 1,
                doy: 7
            }
        })
    }
    typeof define == "function" && define.amd && define(["moment"], e), typeof window != "undefined" && window.moment && e(window.moment)
})();