/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию из личного кабинета абонента ОАО Электросеть
*/

var encodeTbl = [
 /&#1072;/g,'a' ,/&#1073;/g,'б' ,/&#1074;/g,'в' ,/&#1075;/g,'г' ,/&#1076;/g,'д'
,/&#1077;/g,'е' ,/&#1105;/g,'ё' ,/&#1078;/g,'ж' ,/&#1079;/g,'з' ,/&#1080;/g,'и'
,/&#1081;/g,'й' ,/&#1082;/g,'к' ,/&#1083;/g,'л' ,/&#1084;/g,'м' ,/&#1085;/g,'н'
,/&#1086;/g,'о' ,/&#1087;/g,'п' ,/&#1088;/g,'р' ,/&#1089;/g,'с' ,/&#1090;/g,'т'
,/&#1091;/g,'у' ,/&#1092;/g,'ф' ,/&#1093;/g,'х' ,/&#1094;/g,'ц' ,/&#1095;/g,'ч'
,/&#1096;/g,'ш' ,/&#1097;/g,'щ' ,/&#1098;/g,'ъ' ,/&#1099;/g,'ы' ,/&#1100;/g,'ь'
,/&#1101;/g,'э' ,/&#1102;/g,'ю' ,/&#1103;/g,'я' 

,/&#1040;/g,'А' ,/&#1041;/g,'Б' ,/&#1042;/g,'В' ,/&#1043;/g,'Г' ,/&#1044;/g,'Д'
,/&#1045;/g,'Е' ,/&#1025;/g,'Ё' ,/&#1046;/g,'Ж' ,/&#1047;/g,'З' ,/&#1048;/g,'И'
,/&#1049;/g,'Й' ,/&#1050;/g,'К' ,/&#1051;/g,'Л' ,/&#1052;/g,'М' ,/&#1053;/g,'Н'
,/&#1054;/g,'О' ,/&#1055;/g,'П' ,/&#1056;/g,'Р' ,/&#1057;/g,'С' ,/&#1058;/g,'Т'
,/&#1059;/g,'У' ,/&#1060;/g,'Ф' ,/&#1061;/g,'Х' ,/&#1062;/g,'Ц' ,/&#1063;/g,'Ч'
,/&#1064;/g,'Ш' ,/&#1065;/g,'Щ' ,/&#1066;/g,'Ъ' ,/&#1067;/g,'Ы' ,/&#1068;/g,'Ь'
,/&#1069;/g,'Э' ,/&#1070;/g,'Ю' ,/&#1071;/g,'Я' 
];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://lkk.oao-elektroset.ru/";
	var result = {success: true},matches;
	    
    AnyBalance.setDefaultCharset('utf-8'); 
    
    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа!");

	var html = AnyBalance.requestPost(baseurl);
	
	var vid = getParam(html,null,null,/<input\s*type="hidden"\s*name="javax.faces.ViewState"\s*value="([^"]*?)"\s*\/>/im,replaceTagsAndSpaces, null);
	
    html = AnyBalance.requestPost(baseurl + 'ru.tii.lkk/pages/abonentInfo/privateInformation.jsf', {
    	'login:fTemplateLogin:itLS':prefs.login
    	,'login:fTemplateLogin:itPwd':prefs.password
    	,'login:fTemplateLogin':'login:fTemplateLogin'
    	,'javax.faces.ViewState':vid
    	,'login:fTemplateLogin:cbLogin':'Войти в личный кабинет'
    });
     
    var error = getParam(html,null,null,/<span\s*id="login:fTemplateLogin:otLoginError[^>]*?>([^<]*?)<\/span>/im,replaceTagsAndSpaces, null);
	
	if(error)
        throw new AnyBalance.Error(error);
	
	html = getParam(html,null,null,/([\s\S]*)/im,encodeTbl,null);
	
	getParam(html,result,'fio',/<tr[^>]*?>\s*<td[^>]*?>\s*Ф.И.О.:\s*<\/td>\s*<td[^>]*?>\s*<table[^>]*?>\s*<tbody[^>]*?>\s*<tr[^>]*?>\s*<td[^>]*?>([^<]*?)<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>\s*<\/td>\s*<\/tr>/im,replaceTagsAndSpaces, null);
    getParam(html,result,'address',/<tr[^>]*?>\s*<td[^>]*?>\s*Адрес клиентa:\s*<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<\/tr>/im,replaceTagsAndSpaces, null);
    getParam(html,result,'account',/<td\s*class="alignBottom topInfo">№ лицевого счёта:\s*([^<]*?)<br\s*\/>/im,replaceTagsAndSpaces, null);
	getParam(html,result,'tarif',/<td[^>]*?>Величинa тaрифa:\s*<\/td>\s*<td[^>]*?><table[^>]*?><colgroup[^>]*?>[^<]*?<\/colgroup><tbody[^>]*?>([\s\S]*?)<\/tbody>\s*<\/table>\s*<\/td>/im,[/<tr[^>]*?><td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<\/tr>/img, '$1-$2; '],null);
	getParam(html,result,'last',/(<tr[^>]*?>\s*<td[^>]*?>[^<]*?<\/td>\s*<td[^>]*?>[^<]*?<\/td>\s*<td[^>]*?>[^<]*?<\/td>\s*<td[^>]*?><span[^>]*?>[^<]*?<\/span><\/td><\/tr>)/img,[/<tr[^>]*?>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?><span[^>]*?>([^<]*?)<\/span><\/td><\/tr>/img,'$1, $2, $3, $4; '],null);
        	
    AnyBalance.setResult(result);
}
