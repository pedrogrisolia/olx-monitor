const formatPrice = (price) => {
    if (!price || isNaN(price)) {
        return 'R$ 0';
    }

    // Converte para número e formata com separador de milhares
    const priceNumber = parseInt(price);
    return 'R$ ' + priceNumber.toLocaleString('pt-BR');
}

module.exports = {
    formatPrice
}
