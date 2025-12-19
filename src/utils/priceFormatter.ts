/**
 * Formata um preço para exibição no formato brasileiro
 * @param price - Valor do preço (número ou string numérica)
 * @returns String formatada com "R$ " e separadores de milhar
 */
export const formatPrice = (price: number | string | null | undefined): string => {
    if (!price || isNaN(Number(price))) {
        return 'R$ 0';
    }

    // Converte para número e formata com separador de milhares
    const priceNumber = parseInt(String(price));
    return 'R$ ' + priceNumber.toLocaleString('pt-BR');
}

// Mantém compatibilidade com require() CommonJS
module.exports = {
    formatPrice
}
