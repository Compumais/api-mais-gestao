
export const maskCep = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{5})(\d)/, "$1-$2")
        .slice(0, 9);
};

export const maskCreditCard = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{4})(\d)/g, "$1 $2")
        .replace(/(\d{4})\s(\d{4})\s(\d{4})\s(\d{4})\s(\d{4})/, "$1 $2 $3 $4 $5") // Handle standard 16 digits + potential extra
        .slice(0, 19); // 16 digits + 3 spaces
};

export const maskExpirationDate = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "$1/$2")
        .slice(0, 5);
}

export const maskCpfCnpj = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");

    if (cleanValue.length <= 11) {
        // CPF
        return cleanValue
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})/, "$1-$2")
            .replace(/(-\d{2})\d+?$/, "$1"); // Limit length
    } else {
        // CNPJ
        return cleanValue
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .slice(0, 18);
    }
};

export const maskPhone = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .slice(0, 15);
};
