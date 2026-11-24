/*
 * AnyBalance provider: Duolingo
 * Public profile + authenticated XP summaries.
 * Duolingo API is unofficial and may change without notice.
 */
var BASE_URL = 'https://www.duolingo.com';

function requestJson(url, token) {
    var headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
    };
    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }
    var response = AnyBalance.requestGet(url, headers);
    if (!response) {
        throw new AnyBalance.Error('Duolingo вернул пустой ответ.');
    }
    try {
        return JSON.parse(response);
    } catch (e) {
        AnyBalance.trace('Duolingo: ответ не JSON: ' + response.substr(0, 500));
        throw new AnyBalance.Error('Не удалось разобрать ответ Duolingo. Проверьте JWT и доступность API.');
    }
}

function firstDefined(obj, names) {
    if (!obj) return undefined;
    for (var i = 0; i < names.length; i++) {
        if (obj[names[i]] !== undefined && obj[names[i]] !== null) return obj[names[i]];
    }
    return undefined;
}

function toNumber(value) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string' && value !== '' && isFinite(Number(value))) return Number(value);
    return undefined;
}

function getUserFromResponse(data) {
    if (!data) return null;
    if (Object.prototype.toString.call(data) === '[object Array]') return data.length ? data[0] : null;
    if (data.users && Object.prototype.toString.call(data.users) === '[object Array]') return data.users.length ? data.users[0] : null;
    if (data.user && typeof data.user === 'object') return data.user;
    if (data.id || data.username || data.totalXp !== undefined) return data;
    return null;
}

function pad2(n) {
    return n < 10 ? '0' + n : String(n);
}

function formatDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
}

function summaryDate(summary) {
    var value = summary.date;
    if (typeof value === 'number') {
        // Duolingo encodes the calendar-day label as midnight UTC in seconds.
        var d = new Date(value * 1000);
        return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
    }
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.substr(0, 10);
        var parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed.getUTCFullYear() + '-' + pad2(parsed.getUTCMonth() + 1) + '-' + pad2(parsed.getUTCDate());
        }
    }
    return null;
}

function main() {
    // Duolingo API returns application/json without an explicit charset.
    // Set UTF-8 as the default response encoding for AnyBalance.
    var prefs = AnyBalance.getPreferences();
    var username = (prefs.username || '').replace(/^\s+|\s+$/g, '');
    username = username.replace(/^@/, '');
    username = username.replace(/^https?:\/\/(www\.)?duolingo\.com\/(users|profile)\//i, '');
    username = username.replace(/[\/?#].*$/, '');
    var token = (prefs.token || '').replace(/^\s+|\s+$/g, '').replace(/^Bearer\s+/i, '');
    var timezone = (prefs.timezone || 'Europe/Minsk').replace(/^\s+|\s+$/g, '');

    if (!username) {
        throw new AnyBalance.Error('Укажите имя пользователя Duolingo в настройках провайдера.', false, true);
    }

    var fields = 'users{id,username,name,totalXp,streak,streakData,courses,currentCourseId,creationDate,timezone}';
    var profileUrl = BASE_URL + '/2017-06-30/users?username=' + encodeURIComponent(username) +
        '&fields=' + encodeURIComponent(fields);
    var profileData = requestJson(profileUrl);
    var user = getUserFromResponse(profileData);

    if (!user) {
        throw new AnyBalance.Error('Пользователь "' + username + '" не найден или его профиль недоступен.', false, true);
    }

    var result = {success: true};
    var totalXp = toNumber(firstDefined(user, ['totalXp', 'total_xp', 'xp']));
    var streak = toNumber(firstDefined(user, ['streak', 'currentStreak', 'current_streak']));
    var displayName = firstDefined(user, ['name', 'displayName', 'display_name']);
    var actualUsername = firstDefined(user, ['username']) || username;
    var userId = firstDefined(user, ['id', 'userId', 'user_id']);
    var courses = user.courses || [];
    var courseNames = [];
    var courseXpTotal = 0;
    var courseXpCount = 0;

    if (typeof streak === 'object' && streak !== null) {
        streak = toNumber(firstDefined(streak, ['length', 'currentStreak']));
    }
    if (typeof courses === 'string') {
        try { courses = JSON.parse(courses); } catch (ignore) { courses = []; }
    }
    if (Object.prototype.toString.call(courses) !== '[object Array]') courses = [];

    for (var i = 0; i < courses.length; i++) {
        var course = courses[i] || {};
        var title = firstDefined(course, ['title', 'name', 'learningLanguage']);
        var xp = toNumber(firstDefined(course, ['xp', 'totalXp', 'totalXP']));
        if (title) courseNames.push(String(title) + (xp !== undefined ? ' (' + xp + ' XP)' : ''));
        if (xp !== undefined) {
            courseXpTotal += xp;
            courseXpCount++;
        }
    }

    if (totalXp !== undefined) result.total_xp = totalXp;
    if (streak !== undefined) result.streak = streak;
    if (displayName) result.display_name = String(displayName);
    if (actualUsername) result.username = String(actualUsername);
    if (courses.length) result.courses = courseNames.length ? courseNames.join(', ') : String(courses.length);
    if (courseXpCount) result.courses_xp = courseXpTotal;

    if (!token) {
        AnyBalance.trace('Duolingo: JWT не указан, ежедневные сводки пропущены.');
    } else if (userId === undefined || userId === null) {
        AnyBalance.trace('Duolingo: в публичном ответе нет user id, невозможно запросить xp_summaries.');
    } else {
        var profileTimezone = firstDefined(user, ['timezone']);
        if (profileTimezone) timezone = String(profileTimezone);

        var today = new Date();
        var todayStr = formatDate(today);
        var start30 = formatDate(addDays(today, -29));
        var start7 = formatDate(addDays(today, -6));
        var summariesUrl = BASE_URL + '/2017-06-30/users/' + encodeURIComponent(String(userId)) +
            '/xp_summaries?startDate=' + encodeURIComponent(start30) +
            '&endDate=' + encodeURIComponent(todayStr) +
            '&timezone=' + encodeURIComponent(timezone);

        var summariesData = requestJson(summariesUrl, token);
        var summaries = summariesData && (summariesData.summaries || summariesData.xpSummaries || summariesData);
        if (Object.prototype.toString.call(summaries) !== '[object Array]') {
            AnyBalance.trace('Duolingo: неожиданный формат xp_summaries: ' + JSON.stringify(summariesData).substr(0, 1000));
            throw new AnyBalance.Error('Duolingo вернул неожиданный формат ежедневной статистики.');
        }

        var weeklyXp = 0, monthlyXp = 0, hasWeek = false, hasMonth = false;
        var todaySummary = null;
        var sessionsToday = null, sessionTimeToday = null;

        for (var j = 0; j < summaries.length; j++) {
            var summary = summaries[j] || {};
            var day = summaryDate(summary);
            if (!day) continue;
            var gained = toNumber(summary.gainedXp);
            if (gained === undefined) continue;

            if (day >= start30 && day <= todayStr) {
                monthlyXp += gained;
                hasMonth = true;
            }
            if (day >= start7 && day <= todayStr) {
                weeklyXp += gained;
                hasWeek = true;
            }
            if (day === todayStr) todaySummary = summary;
        }

        if (hasWeek) result.weekly_xp = weeklyXp;
        if (hasMonth) result.monthly_xp = monthlyXp;

        if (todaySummary) {
            var todayXp = toNumber(todaySummary.gainedXp);
            sessionsToday = toNumber(todaySummary.numSessions);
            sessionTimeToday = toNumber(todaySummary.totalSessionTime);

            if (todayXp !== undefined) {
                result.today_xp = todayXp;
            }
            if (sessionsToday !== undefined) result.sessions_today = sessionsToday;
            if (sessionTimeToday !== undefined) result.session_time_today = Math.round(sessionTimeToday / 60);
        } else {
            AnyBalance.trace('Duolingo: xp_summaries не содержит запись за сегодня (' + todayStr + ').');
        }

        AnyBalance.trace('Duolingo xp_summaries: получено дней ' + summaries.length +
            ', период ' + start30 + ' — ' + todayStr + ', timezone=' + timezone);
    }

    if (totalXp === undefined && streak === undefined && !displayName && !courses.length) {
        AnyBalance.trace('Unexpected Duolingo profile response: ' + JSON.stringify(profileData).substr(0, 1000));
        throw new AnyBalance.Error('В ответе Duolingo не найдены ожидаемые поля профиля.');
    }

    AnyBalance.setResult(result);
}
