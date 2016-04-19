/**
 * srp-6a protocol authentification client side.
 * This is analog of SRPClientContext java class
 */
var pN = str2bigInt('115b8b692e0e045692cf280b436735c77a5a9e8a9e7ed56c965f87db5b2a2ece3', 16, 0); // 256 bit
var pNBitsLen = 264;
var pg = str2bigInt('02', 16, 0);
var pk = str2bigInt('dbe5dfe0704fee4c85ff106ecd38117d33bcfe50', 16, 0); // for 256 bit N
var pabBitsLen = 256;

function SRPClientContext(salt, vBbytes) {
    this.vS = salt;
    this.vBbs = vBbytes;
    this.va = randBigInt(pabBitsLen, 1);
    // A = g^a % N
    this.vA = powMod(pg, this.va, pN);
}

SRPClientContext.prototype.makeAuthorizationData = function (login, password) {
    var vUserPasswordHash = calcSHA1(login + ":" + (password == null ? "" : password));
    var vB = str2bigInt(this.vBbs, 16, 1);

    // calculate x = SHA(s | SHA(U | ":" | p))
    var vx = this.xCalculate(vUserPasswordHash, this.vS);
    // calculate u = SHA(A || B)
    var vu = srp_compute_u(this.getAbytes(), this.vBbs);

    // Check correct server data
    // The user will abort if he receives B == 0 (mod N) or u == 0.
    if (isZero(mod(vB, pN)) || isZero(vu)) {
        throw "Bad SRP server data";
    }

    // calculate S = (B - kg^x) ^ (a + ux) % N
    var kgN = powMod(pg, vx, pN);
    kgN = mult(kgN, pk);

    var base = add(vB, mult(pN, pk));
    base = sub(base, kgN);
    base = mod(base, pN);

    var exp = add(this.va, mult(vx, vu)); // a + ux
    var vS = powMod(base, exp, pN);

    return calcSHA1Hex(bigInt2str(vS, 16));
};

SRPClientContext.prototype.getAbytes = function () {
    return bigInt2str(this.vA, 16);
};

SRPClientContext.prototype.xCalculate = function (vUserPasswordHash, vs) {
    var h = calcSHA1Hex(vs + vUserPasswordHash);
    var x = str2bigInt(h, 16);
    if (greater(x, pN)) {
        x = mod(x, pN);
    }
    return x;
};

/*
 * SRP-3: u = first 32 bits (MSB) of SHA-1(B)
 * SRP-6(a): u = SHA(A || B)
 */
function srp_compute_u(vAbytes, vBbytes) {
    var hashin = "";

    /* 6a requires left-padding */
    var nlen = 2 * (pNBitsLen >> 3);
    hashin += srp_nzero(nlen - vAbytes.length) + vAbytes;

    /* 6a requires left-padding; nlen already set above */
    hashin += srp_nzero(nlen - vBbytes.length) + vBbytes;

    var h = calcSHA1Hex(hashin);
    var u = str2bigInt(h, 16, 0);

    if (greater(u, pN)) {
        u = mod(u, pN);
    }
    return u;
}

/* Returns a string with n zeroes in it */
function srp_nzero(n) {
    if (n < 1) {
        return "";
    }
    var t = srp_nzero(n >> 1);
    if ((n & 1) == 0) {
        return t + t;
    } else {
        return t + t + "0";
    }
}