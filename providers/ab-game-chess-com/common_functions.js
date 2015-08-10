function checkEmpty(param, error) {
    if (!param || param == '')
        throw new AnyBalance.Error(error);
}