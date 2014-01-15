/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

"Курская телефонная компания" - Интернет (kurskonline)
Сайт оператора: http://www.r46.ru/
Личный кабинет: https://kabinet.r46.ru/
*/

function checkEmpty(param, error, notfatal) {
  if (!param)
        throw new AnyBalance.Error(error, null, !notfatal);
}

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://kabinet.r46.ru/';
  var result = {success: true};

  AnyBalance.setDefaultCharset('utf-8');

  if(AnyBalance.isAvailable('balance', 'agreement')){

    checkEmpty(prefs.login, "Введите логин");
    checkEmpty(prefs.password, "Введите пароль");
    var info = AnyBalance.requestPost(baseurl + "login?next=/", {
      login: prefs.login,
      pass: prefs.password
    });
    var $parse = $('<div>' + info + '</div>');
    var rows = $parse.find("#sidebar table:first tr");
    if(rows.length == 0){
      throw new AnyBalance.Error("Имя пользователя или пароль не верны");
    }
    var row = $(rows[0]);
    result.agreement = row.find("td").text().trim();
    row = $(rows[1]);
    result.balance = Number(row.find("td").text().replace("р.","").trim());
    row = $(rows[2]);
    cells = row.find("td");
    if(cells.length == 3){
     result.details = [$(cells[0]).text().trim(), $(cells[1]).text().replace(/[ \r\n]+/g, " ").trim(), $(cells[2]).text().trim()].join(" ");
    }
    else if(cells.length == 2){
     result.details = [$(cells[0]).text().trim(), $(cells[1]).text().trim()].join(" ");
    }
    else if(cells.length == 1){
     result.details = $(cells[0]).text().trim();
    }
    else{
     result.details = "";
    }
  }
  AnyBalance.setResult(result);
}

