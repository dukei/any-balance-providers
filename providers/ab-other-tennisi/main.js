
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
},
    PERIODS = [{
        'moment': 'days',
        'name': 'последние сутки'
    }, {
        'moment': 'weeks',
        'name': 'неделю'
    }, {
        'moment': 'months',
        'name': 'месяц'
    }, {
        'moment': 'years',
        'name': 'год'
    }, {
        'moment': 'whole',
        'name': 'весь период'
    }],
    MIN_YEAR = 2012,
    CREDIT_TYPES = {
        'expenses': 4,
        'income': 5
    },
    baseurl,
    gameId;

function main() {
	var prefs = AnyBalance.getPreferences();
	baseurl = 'https://kg.tennisi.com/mtg2/cgi/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setAuthentication(prefs.login, prefs.password);

	var html = AnyBalance.requestGet(baseurl + 'sec.welcome' + addUrlParams());

    if (AnyBalance.getLastStatusCode() == 401 && html) {
        AnyBalance.trace(html);
        var error = AB.getParam(html, null, null, /<h4>([\s\S]+?)<\/h4>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /log\s*in/i.test(error));
        }

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    else if (!html || AnyBalance.getLastStatusCode() > 401) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    gameId = AB.getParam(html, null, null, /<frame[^>]*gameid=(\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    var result = {
            success: true,
            wins: '',
            defeats: '',
            total: ''
        };

    getLoginNameCounter(result);
    getPortfolioCounters(result);
    getAccountHistoryCounters(result);

	AnyBalance.setResult(result);
}

function getLoginNameCounter(result) {
    var html = AnyBalance.requestGet(baseurl + 'sec.Empty' + addUrlParams(gameId));
    AB.getParam(html, result, 'login', /<span[^>]*pageheader[^>]*>([\s\S]+?),\s*добро\s+пожаловать[\s\S]+?<\/span>/i, AB.replaceTagsAndSpaces);
}

function getPortfolioCounters(result) {
    var html = AnyBalance.requestGet(baseurl + 'sec.ShowPortfolio' + addUrlParams(gameId));

    var counterTableIndices = {
        'balance': 1,
        'stake': 2,
        'taking_down': 3,
        'bonus': 4,
        'available': 5
    };

    for (var key in counterTableIndices) {
        AB.getParam(html, result, key, getProfileRe(counterTableIndices[key]), AB.replaceTagsAndSpaces, AB.parseBalance);
    }
}

function getAccountHistoryCounters(result) {
    var html = AnyBalance.requestGet(baseurl + 'MONEY_COMMON.AccountHistory' + addUrlParams(gameId));

    var accountId = AB.getParam(html, null, null, /<input[^>]*accid[^>]*value="([\s\S]+?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    for (var idx in PERIODS) {
        var params = getPostParams(accountId, PERIODS[idx].moment);

        html = AnyBalance.requestPost(baseurl + 'MONEY_COMMON.AccountHistory', params);
        var credits = getCreditsCount(html);

        AB.getParam('{0} За {1}: {2} <br>'.format(result['wins'], PERIODS[idx].name, credits.wins), result, 'wins');
        AB.getParam('{0} За {1}: {2} <br>'.format(result['defeats'], PERIODS[idx].name, credits.defeats), result, 'defeats');
        AB.getParam('{0} За {1}: {2} <br>'.format(result['total'], PERIODS[idx].name, credits.total), result, 'total');
    }
}

function getCreditsCount(html) {
    var creditsRe = /букмекер на сомы[\s\S]*?(?:<td[^>]*>[\s\S]*?<\/td>[\s\S]*?){4}(<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>)/ig,
        credits,
        res = {
            wins: 0,
            defeats: 0,
            total: 0
        },
        replaces = [/\s{2,}/g, ' ', /^\s+|\s+$/g, ''];

    html = html.replaceAll(replaces);

    credits = AB.sumParam(html, null, null, creditsRe, null, creditsParser);

    credits.forEach(function(currentValue) {
        if (currentValue.win && currentValue.win > 0) {
            res.wins++;
        }
        else if (currentValue.defeat && currentValue.defeat > 0) {
            res.defeats++;
        }
        res.total++;
    });

    return res;
}

function creditsParser(str) {
    var res = {},
        creditsReplacer = function(match, p1, p2) {
            var re = /<td[^>]*>([\s\S]*?)<\/td>/i,
                defeat = AB.getParam(p1, null, null, re, AB.replaceTagsAndSpaces, AB.parseBalanceSilent),
                win = AB.getParam(p2, null, null, re, AB.replaceTagsAndSpaces, AB.parseBalanceSilent);

            res = {
                'win': win,
                'defeat': defeat
            };
        };

    str.replace(/(<td[^>]*>[\s\S]*?<\/td>)[\s\S]*?(<td[^]*>[\s\S]*?<\/td>)/i, creditsReplacer);
    return res;
}

function addUrlParams(gameId) {
    var res = 'lang=rus';
    if (gameId) {
        res = 'gameid={0}&{1}'.format(gameId, res);
    }
    return '?' + res;
}

function getPostParams(accountId, period) {
    var startDate = moment(),
        endDate = moment(startDate);

    switch (period) {
        case 'whole':
            startDate = moment([MIN_YEAR]);
            break;
        default:
            startDate.subtract(1, period);
    }

    return {
        'gameid': gameId,
        'accid': accountId,
        'lang': 'rus',
        'sdd': startDate.date(),
        'sdm': startDate.month() + 1,
        'sdy': startDate.year(),
        'edd': endDate.date(),
        'edm': endDate.month() + 1,
        'edy': endDate.year()
    };
}

function getProfileRe(index) {
    return new RegExp('Баланс[\\s\\S]*?(?:<td[^>]*>[\\s\\S]+?</td>[\\s\\S]*?){' + index + '}<td[^>]*>([\\s\\S]+?)</td>', 'i');
}

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number){
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
};
