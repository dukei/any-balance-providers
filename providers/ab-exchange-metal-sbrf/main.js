/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы драг металлов с сайта Сбербанка

Сайт: http://data.sberbank.ru/moscow/ru/quotes/metal
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){

  var prefs = AnyBalance.getPreferences();
  var baseurl = "http://data.sberbank.ru/";
  AnyBalance.setDefaultCharset('utf-8');

  var prefs = AnyBalance.getPreferences();

  // были изменены id регионов, поэтому сопоставляем старые (сохраненные в настройках) значения с новыми
  var region = prefs.region || 'moscow';
  var allRegionsNew = ['moscow','saintpetersburg','adygea','altaikrai','amur','arkhangelsk','astrakhan','belgorod','bryansk','buryatia','vladimir','volgograd','vologda','voronezh','dagestan','jewish','zabaykalskykrai','ivanovo','ingushetia','irkutsk','kabardinobalkaria','kaliningrad','kalmykia','kaluga','kamchatka','karachaycherkessia','karelia','kemerovo','kirov','komi','kostroma','krasnodar','krasnoyarsk','kurgan','kursk','leningradoblast','lipetsk','magadan','mariel','mordovia','moscowoblast','murmansk','nenets','nizhnynovgorod','novgorod','novosibirsk','omsk','orenburg','oryol','penza','perm','primorskykrai','pskov','altai','bashkortostan','rostov','ryazan','samara','saratov','sakhalin','sverdlovsk','alania','smolensk','stavropol','tambov','tatarstan','tver','tomsk','tula','tuva','tyumen','udmurtia','ulyanovsk','khabarovsk','khakassia','khantymansi','chelyabinsk','chechnya','chuvashia','chukotka','sakha','yamalonenets','yaroslavl'];
  var allRegionsOld = ['223','246_1','281_2','201_3','271_4','235_5','224_6','275_7','259_8','203_9','206_10','225_11','236_12','276_13','256_14','270_15','204_16','237_17','256_18','205_19','256_20','246_21','256_22','260_23','231_24','256_25','246_26','248_27','207_28','220_29','238_30','282_31','213_32','266_33','277_34','246_35','278_36','232_37','208_38','209_39','261_40','246_41','239_42','210_43','246_44','249_45','217_46','226_47','279_48','227_49','221_50','272_51','246_52','201_53','267_54','283_55','262_56','228_57','229_58','273_59','268_60','256_61','263_62','257_63','280_64','211_65','264_66','250_67','265_68','214_69','217_70','220_71','230_72','274_73','215_74','217_75','269_76','256_77','212_78','233_79','234_80','217_81','240_82'];
  if (allRegionsNew.indexOf(region) < 0) {
    region = allRegionsNew[allRegionsOld.indexOf(region)];
  }
  if(!region) region = 'moscow';

  var html = AnyBalance.requestGet(baseurl + region + '/ru/quotes/metal/', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var result = {success: true};

  getParam(html, result, 'date', /Время\s*?последнего\s*?изменения\s*?котировок\s*?:([\s\S]*?)\s*?</i, replaceTagsAndSpaces, parseDate);

  var tables = getElementsByClassName(html, 'table3_eggs4');
  if (!tables || !tables.length) {
    throw new AnyBalance.Error('Не удается найти котировки. Сайт изменен?.');
  }

  //Чтобы счетчики были получены независимо от включенности, добавим им два подчеркивания
  var colsDef = {
    __buy: {
      re: /Покупка/i
    },
    __sell: {
      re: /Продажа/i
    },
  };

  var info = [];
  processTable(tables[0], info, '', colsDef);
  if (info.length) {
    info[0].name = 'Au';
    info[1].name = 'Ag';
    info[2].name = 'Pt';
    info[3].name = 'Pd';
    info.forEach(function (metal) {
      var name = metal.name;
      var weight = undefined;
      if(AnyBalance.isAvailable(name + '_buy'))
        result[name + '_buy'] = metal.__buy;
      if(AnyBalance.isAvailable(name + '_sell'))
        result[name + '_sell'] = metal.__sell;
      if(AnyBalance.isAvailable(name + '_weight') && (weight = getWeight(name)))
        result[name + '_weight'] = metal.__buy * weight;
    });
  }

  AnyBalance.setResult(result);
}

function getWeight(metal){
	var prefs = AnyBalance.getPreferences();
	if(!prefs.weight)
		return undefined;
	if(/^[\d\s\.,]+$/.test(prefs.weight))
		return parseBalance(prefs.weight);
	var weight = getParam(prefs.weight, null, null, new RegExp(metal + '\s*:([^;a-z]*)', 'i'), null, parseBalance);
	return weight;
}
