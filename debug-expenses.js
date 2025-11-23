// Debug script - تحقق من المصروفات في console
async function testExpensesCalculation() {
    const { db } = await import('./lib/indexedDB');
    await db.init();

    const allExpenses = await db.getAll('expenses');
    console.log('=== All Expenses Debug ===');
    console.log('Total expenses count:', allExpenses.length);
    console.log('First 3 expenses:', allExpenses.slice(0, 3));

    // تحقق من التاريخ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('Today date:', today);

    const todayExpenses = allExpenses.filter((exp) => {
        if (!exp.createdAt) {
            console.log('⚠️ Expense without createdAt:', exp);
            return false;
        }
        const expDate = new Date(exp.createdAt);
        expDate.setHours(0, 0, 0, 0);
        console.log('Expense date:', expDate, 'Match:', expDate.getTime() === today.getTime());
        return expDate.getTime() === today.getTime();
    });

    console.log('Today expenses count:', todayExpenses.length);
    console.log('Today expenses total:', todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));

    return {
        total: allExpenses.length,
        today: todayExpenses.length,
        totalAmount: todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
}

// استدعيها من console:
// testExpensesCalculation().then(console.log)
