    // Подсчёт контрольного числа
    // Возврат INT


    function calcControlSummSnils(snils) {
        // Проверка суммы


        function checkSumm(s) {
            if (s < 10) {
                return "0" + s;
            }
            if (s < 100) {
                return s;
            }
            if (s === 100 || s === 101) {
                return "00";
            }
            if (s > 101) {
                return checkSumm(s % 101);
            }
        }
        // Расчёт суммы
        var summ = 0;
        for (var i = 0; i < 9; i++) {
            summ += (9 - i) * parseInt(snils[i]);
        }
        return checkSumm(summ);
    }

    
    // Проверка на совпадание контрольной суммы
    function checkSnils(snils) {
        if (parseInt(calcControlSummSnils(snils.substring(0, 9))) === parseInt(snils.substring(9, 11))) {
            return true;
        } else {
            return false;
        }
    }

