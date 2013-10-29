/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://new.mcko.ru/";
    AnyBalance.setDefaultCharset('Windows-1251'); 

	if(!prefs.dbg) {
		var html = AnyBalance.requestGet(baseurl, g_headers); 

		var loginName = getParam(html, null, null, /<form[^>]+id="loginForm_n"[^>]*>(?:[\s\S]*?<input[^>]*){1}name=\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode),
		loginPassword = getParam(html, null, null, /<form[^>]+id="loginForm_n"[^>]*>(?:[\s\S]*?<input[^>]*){2}name=\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode),
		param = {};
		param[loginName] = prefs.login;
		param[loginPassword] = prefs.password;
		
		html = AnyBalance.requestPost(baseurl , param , addHeaders({Referer: baseurl })); 
		
		if(!/submit_exit/i.test(html)){
			var error = getParam(html, null, null, /<div[^>]+id=mess[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}
	
    html = AnyBalance.requestGet(baseurl + 'new_mcko/index.php?c=dnevnik&d=usp', addHeaders({Referer: baseurl + 'new_mcko/index.php?c=dnevnik'}, g_headers)); 
	
    var result = {success: true};

	
	
    function constructor(subject, paramName) {    
        var table = getParam(html, null, null, /<table[^>]*border="1"[^>]*>([\s\S]*?)<\/table>/i),
		row = getParam(table, null, null, new RegExp('(' + subject + '</nobr><td>[\\s\\S]*?)<tr>', 'i')),
		i,
		averageMark,
		lastM;

		var allMarks = sumParam(row, null, null, /<td[^>]*align="center"[^>]*>([^<]*)/ig);
		// Средняя оценка всегда -4 от позиции конца таблицы
		averageMark = allMarks[allMarks.length - 4];
		
        for (i = allMarks.length - 5; i > 0; i--) {
            if (allMarks[i] !== "") {
                lastM = getParam(allMarks[i], null, null, null, replaceTagsAndSpaces, html_entity_decode);  
                i = 0;
            } 
        }
        if (averageMark) 
			getParam(averageMark + ' / ' + lastM, result, 'balance' + paramName, null, replaceTagsAndSpaces, html_entity_decode);    

    }

    constructor("английский язык", "Eng");
    constructor("биология", "Bio");
    constructor("география", "Geo");
    constructor("изобразительное искусство", "Izo");
    constructor("история", "Ist");
    constructor("литература", "Lit");
    constructor("математика", "Mat");
    constructor("обществознание \\(включая экономику и право\\)", "Obsch");
    constructor("русский язык", "Rus");
    constructor("музыка", "Mus");
	constructor("алгебра", "Alg");
	constructor("искусство и МХК", "Mhk");
	constructor("физика", "Fiz");
	constructor("геометрия", "Geom");
	constructor("технология", "Tech");
	
    AnyBalance.setResult(result);
}
