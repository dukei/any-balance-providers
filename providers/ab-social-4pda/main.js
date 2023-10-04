/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
	'Cache-Control': 'max-age=0',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
};

var baseurl = 'https://4pda.to/forum/index.php?';

function main(){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.restoreCookies();
	
    var html = AnyBalance.requestGet(baseurl + 'act=boardrules', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
    if(!/action=logout/.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
        html = AnyBalance.requestGet(baseurl + "act=auth", g_headers);
		
		var form = getElement(html, /<form[^>]+id="auth"[^>]*>/i);
        if(!form){
        	AnyBalance.trace(form);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if(name == 'login') {
	   			return prefs.login;
    		}else if(name == 'password'){
	    		return prefs.password;
	    	}else if(name == 'captcha'){
				var imgUrl = getParam(html, null, null, /captcha-sig[\S\s]*?src="([^"]*)/i);
				if(!imgUrl){
	    			AnyBalance.trace(html);
	    			throw new AnyBalance.Error('Не удалось найти капчу. Сайт изменен?');
	    		}   
                var img = AnyBalance.requestGet(imgUrl, addHeaders({'Referer': baseurl + 'act=auth'}));
	    		return AnyBalance.retrieveCode('Пожалуйста, введите число с картинки', img, {
		            inputType: 'number',
		            minLength: 4,
		            maxLength: 4,
		            time: 180000
	            });
	    	}
	        
	    	return value;
	    });
		
	    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
		html = AnyBalance.requestPost(action, params, addHeaders({
		    'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': 'https://4pda.to',
            'Referer': baseurl + 'act=auth'
		}));
			
        if(!/action=logout/i.test(html)){
			var errorsList = getElement(html, /<ul[^>]+class="errors-list"[^>]*>/i);
			var errors = getElements(errorsList, /<li/ig, replaceTagsAndSpaces);
			var error = (errors || []).map(function(e) { return e }).join('\n');
			if(error)
			    throw new AnyBalance.Error(error, null, /логин|парол|число|код/i.test(error));	
		    
			AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
	    }
		
		html = AnyBalance.requestGet(baseurl + 'act=boardrules', g_headers);
        
		AnyBalance.saveCookies();
        AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
    var userId = getParam(html, null, null, /index\.php\?showuser=(\d*)"/i);
	if(!userId) 
		throw new AnyBalance.Error('Не удалось получить идентификатор пользователя. Сайт изменен?');
    
	var result = {success: true};
	
	result.qms = getParam(html, null, null, /act=qms[\s\S]*?Сообщения \((\d*?)\)/i, null, parseBalance)||0;
    result.mentions = getParam(html, null, null, /act=mentions"\>Упоминания \((\d*?)\)/i, null, parseBalance)||0;
    result.fav = getParam(html, null, null, /act=fav[\s\S]*?Избранное \((\d*?)\)/i, null, parseBalance)||0;
        
	if(AnyBalance.isAvailable('reputation', 'posts', 'topics', 'karma', 'postssite', 'comments', '__tariff', 'status', 'warnings', 'unote', 'regdate', 'username', 'devices', 'rewards')){
      	html = AnyBalance.requestGet(baseurl + 'showuser=' + userId, g_headers);
		
        getParam(html, result, 'reputation', /data-member-rep="\d*?">(\d*?)</i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'posts', /Найти сообщения пользователя" rel="nofollow">(\d*?)</i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'topics', /title="Найти темы пользователя" rel="nofollow">(\d*?)</i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'karma', /Карма:[\s\S]*?<a[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'postssite', /Найти посты пользователя" rel="nofollow">(\d*?)</i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'comments', /Найти комментарии пользователя" rel="nofollow">(\d*?)</i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, '__tariff', /<div[^>]+class="photo"[\s\S]*?style[\s\S]*?>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'status', /<div[^>]+class="photo"[\s\S]*?class="title"[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'warnings', /Предупреждения[\s\S]*?act=warn[^>]*>([^"]*)<\/a>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'unote', /<div[^>]+class="u-note"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'regdate', /Регистрация:[\s\S]*?"area"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'username', /<div[^>]+class="photo"[\s\S]*<h1[^>]*>([\S\s]*?)<\/h1>/i, replaceTagsAndSpaces, null);
		
		if(AnyBalance.isAvailable('devices')){
		    var deviceList = getElement(html, /<ul[^>]+device-list[^>]*>/i);
		    var devices = getElements(deviceList, /<li/ig, replaceTagsAndSpaces);
		    if(devices && devices.length > 0){
			    AnyBalance.trace('Найдено устройств: ' + devices.length);
		        for(var i=0; i<devices.length; ++i){
			        var device = devices[i];
					if(i == 0)
						device = '<b>' + device + '</b>';
			        sumParam(device, result, 'devices', null, null, null, create_aggregate_join(',<br> '));
			    }
		    }else{
		        AnyBalance.trace('Не удалось получить информацию по устройствам');
		        result.devices = 'Нет устройств';
	        }
		}
		
		if(AnyBalance.isAvailable('rewards')){
		    var rewards = getElements(html, /<a[^>]+class="showuser-reward[^>]*>/ig);
		    if(rewards && rewards.length > 0){
			    AnyBalance.trace('Найдено достижений: ' + rewards.length);
		        for(var i=0; i<rewards.length; ++i){
			        var reward = rewards[i];
				    
				    var title = getParam(reward, null, null, /<h3[^>]+class="reward-title[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, null);
				    var desc = getParam(reward, null, null, /<div[^>]+class="reward-desc[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, null);
				    var dt = getParam(reward, null, null, /<div[^>]+class="reward-date[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
				    var dts = new Date(dt);
				    var date = n2(dts.getDate()) + '.' + n2(dts.getMonth()+1) + '.' + dts.getFullYear();
				    
				    var rew = '<b>' + title + '</b>';
			        rew += '<br> ' + desc;
		            rew += '.<br> Получено ' + date;
			        sumParam(rew, result, 'rewards', null, null, null, create_aggregate_join('.<br><br> '));
			    }
		    }else{
		        AnyBalance.trace('Не удалось получить информацию по достижениям');
		        result.devices = 'Нет достижений';
	        }
		}
    }
	
	if(AnyBalance.isAvailable('email')){
		html = AnyBalance.requestGet(baseurl + 'showuser=' + userId + '&action=edit&_=' + new Date().getTime(), g_headers);

        getParam(html, result, 'email', /name="email[^>]+value="([^"]*)/i, replaceTagsAndSpaces, null);
	}
    
    AnyBalance.setResult(result);
}