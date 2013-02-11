Чтобы распознавать в провайдере дату в почти любом формате, требуется включить файлы

moment.min.js
moment.lang.ru.min.js
moment.lang.uk.js

(Ненужные языки можно не включать).

Затем добавить следующую функцию в main.js, при этом можно настроить форматы даты:

function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

И, наконец, надо выбрать нужный язык где-нибудь в начале main():

moment.lang('uk');

Полная информация по moment.js здесь: http://momentjs.com/
