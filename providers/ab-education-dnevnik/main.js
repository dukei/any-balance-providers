/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

var g_weekdays = {1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс'};

var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://dnevnik.ru';
	var baseurlLogin = 'https://login.dnevnik.ru/login';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('dnevnikru', prefs.login);

	g_savedData.restoreCookies();
	
	prefs.id = prefs.id || undefined;
	
	var html = AnyBalance.requestGet(baseurl + '/userfeed', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout|"isAuthenticated":\s*?true/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
	    
	    var html = AnyBalance.requestGet(baseurlLogin, g_headers);
	    
	    var form = getElement(html, /<form[^>]+class="login"[^>]*>/i);
	    if(!form){
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	    }
	       
	    var params = createFormParams(form, function(params, str, name, value) {
		    if (name == 'login') {
			    return prefs.login;
		    } else if (name == 'password') {
			    return prefs.password;
		    }
	           
		    return value;
	    });
			
	    html = AnyBalance.requestPost(baseurlLogin, params, addHeaders({
       	    'Content-Type': 'application/x-www-form-urlencoded',
       	    'Referer': baseurlLogin
	    }), g_headers);
	    
	    if(/OfferLinkingAccounts/i.test(AnyBalance.getLastUrl())){
		    AnyBalance.trace('Сайт затребовал привязку учетной записи к Госуслугам. Пропускаем...');
		    
		    html = AnyBalance.requestGet(baseurl + '/', g_headers);
	    }
	    
	    if(!/logout|"isAuthenticated":\s*?true/i.test(html)){
		    var error = getParam(html, null, null, /<div[^>]+class="message\s*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		    if(error)
			    throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var accounts;
	var data = getJsonObject(html, /__USER__START__PAGE__INITIAL__STATE__\s*?=s*?/);
	
	if(data && data.userSchedule && data.userSchedule.children){
		AnyBalance.trace('Список идентификаторов: ' + JSON.stringify(data.userSchedule.children));
		accounts = data.userSchedule.children;
	}else{
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить список идентификаторов. Сайт изменен?');
	}
	
	if(accounts.length < 1 && (prefs.id && !endsWith(prefs.id))){
		throw new AnyBalance.Error('Не удалось найти идентификатор с последними цифрами ' + prefs.id + '. В вашем кабинете нет ни одного идентификатора');
	}

	if(accounts.length > 0){
		AnyBalance.trace('Найдено идентификаторов: ' + accounts.length);
	    var curAcc;
	    for(var i=0; i<accounts.length; ++i){
		    var acc = accounts[i];
		    AnyBalance.trace('Найден идентификатор ' + acc.personId);
		    if(!curAcc && (!prefs.id || endsWith(acc.personId, prefs.id))){
			    AnyBalance.trace('Выбран идентификатор ' + acc.personId);
			    curAcc = acc;
		    }
	    }
        
	    if(!curAcc)
		    throw new AnyBalance.Error('Не удалось найти идентификатор с последними цифрами ' + prefs.id);
	    // Идентификаторы требуются для запроса оценок
	    var personId = curAcc.personId;
		var schoolId = curAcc.schoolId;
	}
	
	var result = {success: true};
	
	if(AnyBalance.isAvailable('user_fio')){
	    if(data && data.userContext && data.userContext.userContextInfo){
		    AnyBalance.trace('Профиль родителя: ' + JSON.stringify(data.userContext.userContextInfo));
		    var parentInfo = data.userContext.userContextInfo;
	    }else{
		    AnyBalance.trace('Не удалось получить информацию о профиле родителя');
	    }
		
		if(parentInfo){
	        getParam(parentInfo.name, result, 'user_fio');
		}
	}
	
	var now = new Date(); // Считаем от текущего дня недели и получаем дату понедельника и воскресенья для запроса оценок за календарную неделю
	
    var startOfWeek = new Date(now.getFullYear(), now.getMonth(), (now.getDate() - now.getDay()) +1);
    var endOfWeek = new Date(now.getFullYear(), now.getMonth(), startOfWeek.getDate() + 6);
	
	var dateFrom = (startOfWeek.getFullYear() + '-' + n2(startOfWeek.getMonth()+1) + '-' + n2(startOfWeek.getDate()) + 'T00:00:00');
	var dateTo = (endOfWeek.getFullYear() + '-' + n2(endOfWeek.getMonth()+1) + '-' + n2(endOfWeek.getDate()) + 'T23:59:59');
	
	var startDate = Math.floor(new Date(dateFrom).getTime() / 1000);
	var finishDate = Math.floor(new Date(dateTo).getTime() / 1000);
	
	var html = AnyBalance.requestGet(baseurl + '/marks/school/' + schoolId + '/student/' + personId, addHeaders({'Referer': AnyBalance.getLastUrl()}));
	
	var info = getJsonObject(html, /__MARKS__INITIAL__STATE__\s*?=s*?/);
	
	if(info && info.context && info.context.schoolMemberships){
		AnyBalance.trace('Профиль ребенка: ' + JSON.stringify(info.context.schoolMemberships));
		var userInfo = info.context.schoolMemberships && info.context.schoolMemberships[0];
		
		if(userInfo){
			getParam(userInfo.personId, result, 'child_id', null, replaceTagsAndSpaces);
			var school = getParam(userInfo.schoolName, result, 'school', null, replaceTagsAndSpaces);
			var person = {};
	        var firstName = sumParam(userInfo.firstName, person, '__n', null, null, null, create_aggregate_join(' '));
//	        sumParam(userInfo.userName.secondName, person, '__n', null, null, null, create_aggregate_join(' '));
	        var lastName = sumParam(userInfo.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	        getParam(person.__n, result, 'child_fio');
			
			getParam(firstName + (school ? ' (' + school + ')' : ' ' + lastName), result, '__tariff');
		}
	}else{
		AnyBalance.trace('Не удалось получить информацию о профиле ребенка');
	}
	
	var html = AnyBalance.requestGet(baseurl + '/api/v2/marks/diary?personId=' + personId + '&schoolId=' + schoolId + '&startDate=' + startDate + '&finishDate=' + finishDate + '&timestamp=' + new Date().getTime(), g_headers);
	
	var json = getJson(html);
	
//	AnyBalance.trace('Оценки за неделю: ' + JSON.stringify(json));
    
    var days = json.days;
    
    AnyBalance.trace('Найдено учебных дней на неделе: ' + days.length);
	
	if(days.length < 7){ // Если учебная неделя неполная, возвращется ограниченный массив, поэтому создаем новый массив days с заполнением всех дней недели
		var origDays = days;
		var days = [];
		
		for(var i = 0; i < 7; i++) {
			var weekDay = startOfWeek.getDay() + i;
			
		    for(var j = 0; j < origDays.length; j++) {
				var currDay = new Date((origDays[j].date) * 1000).getDay();
			    
				if(currDay == weekDay){ // Если в оригинальном массиве есть объект с данными за этот день, пушим его в новый массив days под номером дня
					days.push(origDays[j]);
					
					break;
				}
		    }
			
			if(days.length != weekDay) // Если данных за этот день не найдено, добавляем пустой объект в массив
				days.push({});
		}
	}
	
	var now = new Date();
	var dateNow = n2(now.getDate()) + '.' + n2(now.getMonth()+1) + '.' + now.getFullYear();
	
	for(var i = 0; i < days.length; i++) {
		var day = days[i];
		
		if(day.lessons && day.lessons.length > 0){
		    AnyBalance.trace('Найдено предметов за ' + (i + 1) + '-й день недели: ' + day.lessons.length);
			
			var totalLessons = '';
			
			var dt = new Date(day.date*1000);
			var date = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
			
		    for(var j = 0; j < day.lessons.length; j++) {
				var mark = '';
				
				var lesson = day.lessons[j];
				AnyBalance.trace('Найден предмет "' + lesson.subject.name + '": ' + JSON.stringify(lesson));
				var lessonNum = lesson.number;
				var lessonTime = lesson.hours.startHour + ':' + lesson.hours.startMinute + ' - ' + lesson.hours.endHour + ':' + lesson.hours.endMinute;
	            
		        var subject = getParam(lesson.subject.name, null, null, null, replaceTagsAndSpaces);
                
				if(lesson.workMarks && lesson.workMarks.length && lesson.workMarks.length > 0){
					for(var k = 0; k < lesson.workMarks.length; k++) {
				        var workMark = lesson.workMarks[k];
//					    AnyBalance.trace('Работа по предмету "' + lesson.subject.name + '" (' + workMark.workName + '): ' + JSON.stringify(workMark));
					
					    for(var m = 0; m < workMark.marks.length; m++) {
				            var marks = workMark.marks[m];
							AnyBalance.trace('Оценка за работу по предмету (' + workMark.workName + '): ' + JSON.stringify(marks));
					        
				            mark = sumParam(marks.value, null, null, null, null, parseBalanceSilent, create_aggregate_join(', '));
						}
					}
				}else{
			        AnyBalance.trace('Работ и оценок по предмету не найдено' );
		        }
				
				if(prefs.show_shedule && !mark)
					mark = '–';
				
                if(subject && mark){
					if(prefs.show_date){
                        totalLessons += '<br/>' + ((prefs.show_num && lessonNum) ? lessonNum + (prefs.show_subject ? '.' : '') : '') 
						             + (prefs.show_subject ? subject + ': ' : ((prefs.show_num && lessonNum) ? ': ' : '')) + mark
						             + ((prefs.show_time && lessonTime) ? '<br/><small>(' + lessonTime + ')</small>' : '');
					}else{
						totalLessons += (totalLessons != '' ? '<br/>' : '') + ((prefs.show_num && lessonNum) ? lessonNum + (prefs.show_subject ? '.' : '') : '')
               						 + (prefs.show_subject ? subject + ': ' : ((prefs.show_num && lessonNum) ? ': ' : '')) + mark
						             + ((prefs.show_time && lessonTime) ? '<br/><small>(' + lessonTime + ')</small>' : '');
					}
				}
		    }
			
			if(prefs.show_date && date){
		        getParam('<b>' + (prefs.show_day ? g_weekdays[dt.getDay()] + ', ' : '' ) + date + '</b>' + (totalLessons != '' ? totalLessons : '<br/>Нет оценок'), result, 'total' + i);
		    }else{
			    if(prefs.show_day){
			        getParam('<b>' + g_weekdays[dt.getDay()] + '</b><br/>' + (totalLessons != '' ? totalLessons : 'Нет оценок'), result, 'total' + i);
			    }else{
				    getParam(totalLessons != '' ? totalLessons : 'Нет оценок', result, 'total' + i);
			    }
		    }
			
			if(date == dateNow)
			    result.totalNow = result['total' + i];
		}else{
			AnyBalance.trace('Не удалось найти занятия за ' + (i + 1) + '-й день недели');
		}
		
		if(AnyBalance.isAvailable('total' + i) && !result['total' + i])
		    result['total' + i] = getUnavailableDateInfo(i);
    }
	
	AnyBalance.setResult(result);
}

function getUnavailableDateInfo(val) {
	var prefs = AnyBalance.getPreferences();
	var now = new Date(); // Считаем от текущего дня недели и получаем дату от понедельника
	
    var startOfWeek = new Date(now.getFullYear(), now.getMonth(), (now.getDate() - now.getDay()) +1);
    var currOfWeek = new Date(now.getFullYear(), now.getMonth(), startOfWeek.getDate() + val);
	var currDate = n2(currOfWeek.getDate()) + '.' + n2(currOfWeek.getMonth()+1) + '.' + currOfWeek.getFullYear();
	
	var info = '';
	
	if(prefs.show_date){
		info = '<b>' + (prefs.show_day ? g_weekdays[currOfWeek.getDay()] + ', ' : '' ) + currDate + '</b><br/>Нет занятий';
	}else{
		if(prefs.show_day){
		    info = '<b>' + g_weekdays[currOfWeek.getDay()] + '</b><br/>Нет занятий';
	    }else{
		    info = 'Нет занятий';
	    }
	}
	
	return info;
}
