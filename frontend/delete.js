export const updateSale = async (req, res) => {
    try {
      const userId = req.user && req.user._id;
      const { saleId } = req.params;
      const updateData = req.body;
  
      // 1. Fetch old sale
      const oldSale = await Sale.findOne({ _id: saleId, userId });
      if (!oldSale) return res.status(404).json({ success: false, message: 'Sale not found' });
  
      // 2. Handle stock updates for modified items
      const oldItems = oldSale.items || [];
      const newItems = updateData.items || [];
      
      // Create maps for easy comparison
      const oldItemMap = new Map();
      oldItems.forEach(item => {
        oldItemMap.set(item.item, {
          qty: Number(item.qty) || 0,
          unit: item.unit || 'Piece'
        });
      });
      
      const newItemMap = new Map();
      const newItemIndexMap = new Map(); // Track index for updating original items
      newItems.forEach((item, index) => {
        newItemMap.set(item.item, {
          qty: Number(item.qty) || 0,
          unit: item.unit || 'Piece',
          index: index // Store the index to update original item
        });
        newItemIndexMap.set(item.item, index);
      });
      
      // Update stock for all items
      const allItems = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);
      
      for (const itemName of allItems) {
        const dbItem = await Item.findOne({ userId: userId.toString(), name: itemName });
        if (!dbItem) continue;
        
        const oldItem = oldItemMap.get(itemName);
        const newItem = newItemMap.get(itemName);
        
        // Calculate old stock quantity (what was cut before)
        let oldStockQty = 0;
        if (oldItem) {
          oldStockQty = oldItem.qty;
          // Convert to base unit if needed
          if (dbItem.unit && typeof dbItem.unit === 'object' && dbItem.unit.base && dbItem.unit.secondary) {
            if (oldItem.unit === dbItem.unit.secondary && dbItem.unit.conversionFactor) {
              oldStockQty = oldItem.qty * dbItem.unit.conversionFactor;
            }
          } else if (typeof dbItem.unit === 'string' && dbItem.unit.includes(' / ')) {
            const parts = dbItem.unit.split(' / ');
            if (oldItem.unit === parts[1]) {
              oldStockQty = oldItem.qty * 12; // Default conversion
            }
          }
        }
        
        // Calculate new stock quantity (what should be cut now)
        let newStockQty = 0;
        if (newItem) {
          newStockQty = newItem.qty;
          // Convert to base unit if needed
          if (dbItem.unit && typeof dbItem.unit === 'object' && dbItem.unit.base && dbItem.unit.secondary) {
            if (newItem.unit === dbItem.unit.secondary && dbItem.unit.conversionFactor) {
              newStockQty = newItem.qty * dbItem.unit.conversionFactor;
            }
          } else if (typeof dbItem.unit === 'string' && dbItem.unit.includes(' / ')) {
            const parts = dbItem.unit.split(' / ');
            if (newItem.unit === parts[1]) {
              newStockQty = newItem.qty * 12; // Default conversion
            }
          }
        }
        
        // Handle simple stock adjustment
        if (dbItem) {
          console.log(`Stock adjustment for ${itemName}: old=${oldStockQty}, new=${newStockQty}`);
          
          // First, restore old stock (add back what was consumed)
          if (oldStockQty > 0) {
            dbItem.stock = (dbItem.stock || 0) + oldStockQty;
            console.log(`Restored ${oldStockQty} units to ${itemName}, new stock: ${dbItem.stock}`);
          }
          
          // Calculate difference in quantity (only consume the additional amount)
          const quantityDifference = newStockQty - oldStockQty;
          console.log(`Quantity difference for ${itemName}: old=${oldStockQty}, new=${newStockQty}, difference=${quantityDifference}`);
          
          // Handle quantity changes
          if (quantityDifference > 0) {
            // Quantity increased - consume additional stock
            try {
              // Plan FIFO batches for additional consumption
              const plannedBatches = [];
              let remainingPlan = Number(quantityDifference) || 0;
              if (!Array.isArray(dbItem.batches)) dbItem.batches = [];
              for (let i = 0; i < dbItem.batches.length && remainingPlan > 0; i++) {
                const batch = dbItem.batches[i];
                const take = Math.min(batch.quantity || 0, remainingPlan);
                if (take > 0) {
                  plannedBatches.push({ quantity: take, purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0 });
                  remainingPlan -= take;
                }
              }
  
              // Store original batches before consumption
              const originalBatches = JSON.parse(JSON.stringify(dbItem.batches || []));
              
              console.log(`Before reduceStock for ${itemName}:`, {
                additionalQuantityNeeded: quantityDifference,
                currentStock: dbItem.stock,
                availableBatches: originalBatches.length,
                batchDetails: originalBatches.map(b => ({ qty: b.quantity, price: b.purchasePrice }))
              });
              
              // Try to reduce stock by the additional amount only
              let actualStockReduced = 0;
              const consumedBatches = [];
              
              try {
                await dbItem.reduceStock(quantityDifference);
                actualStockReduced = quantityDifference;
                
                console.log(`After reduceStock for ${itemName}:`, {
                  currentStock: dbItem.stock,
                  remainingBatches: dbItem.batches.length,
                  batchDetails: dbItem.batches.map(b => ({ qty: b.quantity, price: b.purchasePrice }))
                });
                
                // Calculate actual consumed batches by comparing before and after
                let totalConsumed = 0;
                
                // Compare original batches with current batches to find what was consumed
                for (const originalBatch of originalBatches) {
                  const currentBatch = dbItem.batches.find(b => 
                    b.purchasePrice === originalBatch.purchasePrice && 
                    b.createdAt.getTime() === originalBatch.createdAt.getTime()
                  );
                  
                  if (currentBatch) {
                    const consumed = originalBatch.quantity - currentBatch.quantity;
                    if (consumed > 0) {
                      consumedBatches.push({
                        quantity: consumed,
                        purchasePrice: originalBatch.purchasePrice
                      });
                      totalConsumed += consumed;
                    }
                  } else {
                    // Batch was completely consumed
                    consumedBatches.push({
                      quantity: originalBatch.quantity,
                      purchasePrice: originalBatch.purchasePrice
                    });
                    totalConsumed += originalBatch.quantity;
                  }
                }
              } catch (stockError) {
                console.log(`reduceStock failed for ${itemName}, using manual batch reduction:`, stockError.message);
                
                // Manual batch-wise reduction when reduceStock fails
                const availableStock = dbItem.stock || 0;
                actualStockReduced = Math.min(quantityDifference, availableStock);
                
                let remaining = actualStockReduced;
                for (let i = 0; i < originalBatches.length && remaining > 0; i++) {
                  const batch = originalBatches[i];
                  const canReduce = Math.min(batch.quantity || 0, remaining);
                  if (canReduce > 0) {
                    consumedBatches.push({
                      quantity: canReduce,
                      purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0
                    });
                    
                    // Update the actual batch
                    const actualBatch = dbItem.batches[i];
                    if (actualBatch) {
                      actualBatch.quantity = Math.max(0, (actualBatch.quantity || 0) - canReduce);
                    }
                    
                    remaining -= canReduce;
                  }
                }
                
                // Remove empty batches and update stock
                dbItem.batches = dbItem.batches.filter(b => (b.quantity || 0) > 0);
                dbItem.stock = Math.max(0, (dbItem.stock || 0) - actualStockReduced);
                await dbItem.save();
              }
              
              console.log(`Stock reduction summary for ${itemName}:`, {
                requested: quantityDifference,
                actuallyReduced: actualStockReduced,
                consumedBatches: consumedBatches,
                newStock: dbItem.stock
              });
              
              // For sale record, we need to save consumed batches for the NEW total quantity
              // Get old consumed batches and combine with new ones
              const oldSaleItem = oldItems.find(item => item.item === itemName);
              const finalConsumedBatches = [];
              
              // Add old consumed batches first (if any)
              if (oldSaleItem && Array.isArray(oldSaleItem.consumedBatches)) {
                finalConsumedBatches.push(...oldSaleItem.consumedBatches);
              }
              
              // Add newly consumed batches
              finalConsumedBatches.push(...consumedBatches);
              
              const totalCost = finalConsumedBatches.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
              
              console.log(`Final consumed batches for ${itemName}:`, {
                oldBatches: oldSaleItem?.consumedBatches || [],
                newBatches: consumedBatches,
                finalBatches: finalConsumedBatches,
                totalCost,
                totalQuantity: newStockQty
              });
              
              if (newItem) {
                // Update the original item in the updateData.items array
                const itemIndex = newItemIndexMap.get(itemName);
                if (itemIndex !== undefined && updateData.items[itemIndex]) {
                  updateData.items[itemIndex].consumedBatches = finalConsumedBatches;
                  updateData.items[itemIndex].totalCost = totalCost;
                  console.log(`Updated item ${itemName} at index ${itemIndex} with final batches:`, {
                    batches: finalConsumedBatches,
                    cost: totalCost
                  });
                }
              }
              
            } catch (error) {
              console.error(`Stock consumption failed for ${itemName}:`, error.message);
              // Fallback: batch-aware FIFO reduction
              try {
                const currentStock = dbItem.stock || 0;
                const requestQty = Number(newStockQty) || 0;
                const toDeduct = Math.min(currentStock, requestQty);
                if (!Array.isArray(dbItem.batches)) {
                  dbItem.batches = [];
                }
                let remaining = toDeduct;
                const consumed = [];
                for (let i = 0; i < dbItem.batches.length && remaining > 0; i++) {
                  const batch = dbItem.batches[i];
                  const canDeduct = Math.min(batch.quantity || 0, remaining);
                  batch.quantity = (batch.quantity || 0) - canDeduct;
                  remaining -= canDeduct;
                  if (canDeduct > 0) {
                    consumed.push({ quantity: canDeduct, purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0 });
                  }
                }
                dbItem.batches = dbItem.batches.filter(b => (b.quantity || 0) > 0);
                dbItem.stock = (dbItem.stock || 0) - toDeduct;
                if (newItem) {
                  const totalCost = consumed.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
                  // Update the original item in the updateData.items array
                  const itemIndex = newItemIndexMap.get(itemName);
                  if (itemIndex !== undefined && updateData.items[itemIndex]) {
                    updateData.items[itemIndex].consumedBatches = consumed;
                    updateData.items[itemIndex].totalCost = totalCost;
                  }
                }
              } catch (fallbackErr) {
                dbItem.stock = Math.max(0, (dbItem.stock || 0) - (Number(newStockQty) || 0));
              }
            }
          } else if (quantityDifference < 0) {
            // Quantity decreased - no additional stock consumption needed
            console.log(`Quantity decreased for ${itemName}: no additional stock consumption needed`);
            
            // For sale record, we need to recalculate consumed batches for the NEW total quantity
            const oldSaleItem = oldItems.find(item => item.item === itemName);
            if (oldSaleItem && Array.isArray(oldSaleItem.consumedBatches)) {
              // Calculate proportional reduction in consumed batches
              const oldTotalQty = oldStockQty;
              const newTotalQty = newStockQty;
              const reductionRatio = newTotalQty / oldTotalQty;
              
              const finalConsumedBatches = oldSaleItem.consumedBatches.map(batch => ({
                quantity: Math.round(batch.quantity * reductionRatio),
                purchasePrice: batch.purchasePrice
              }));
              
              const totalCost = finalConsumedBatches.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
              
              console.log(`Quantity decrease - recalculated batches for ${itemName}:`, {
                oldBatches: oldSaleItem.consumedBatches,
                newBatches: finalConsumedBatches,
                reductionRatio,
                totalCost,
                totalQuantity: newStockQty
              });
              
              if (newItem) {
                // Update the original item in the updateData.items array
                const itemIndex = newItemIndexMap.get(itemName);
                if (itemIndex !== undefined && updateData.items[itemIndex]) {
                  updateData.items[itemIndex].consumedBatches = finalConsumedBatches;
                  updateData.items[itemIndex].totalCost = totalCost;
                  console.log(`Updated item ${itemName} at index ${itemIndex} with reduced batches:`, {
                    batches: finalConsumedBatches,
                    cost: totalCost
                  });
                }
              }
            }
          } else {
            // Quantity unchanged - keep existing consumed batches
            console.log(`Quantity unchanged for ${itemName}: keeping existing consumed batches`);
            
            const oldSaleItem = oldItems.find(item => item.item === itemName);
            if (oldSaleItem && Array.isArray(oldSaleItem.consumedBatches)) {
              if (newItem) {
                const itemIndex = newItemIndexMap.get(itemName);
                if (itemIndex !== undefined && updateData.items[itemIndex]) {
                  updateData.items[itemIndex].consumedBatches = oldSaleItem.consumedBatches;
                  updateData.items[itemIndex].totalCost = oldSaleItem.totalCost || 0;
                  console.log(`Kept existing batches for ${itemName}:`, oldSaleItem.consumedBatches);
                }
              }
            }
          }
        } else {
          // Simple stock adjustment
          const stockAdjustment = oldStockQty - newStockQty;
          dbItem.stock = (dbItem.stock || 0) + stockAdjustment;
          
          console.log(`Simple stock adjustment for ${itemName}: old=${oldStockQty}, new=${newStockQty}, adjustment=${stockAdjustment}, final=${dbItem.stock}`);
        }
  
        await dbItem.save();
      }
  
      // 3. Calculate new grandTotal
      const originalSubTotal = newItems.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        return sum + (qty * price);
      }, 0);
      
      // Calculate item-level discounts
      const totalItemDiscount = newItems.reduce((total, item) => {
        let itemDiscount = 0;
        if (item.discountPercentage) {
          const qty = Number(item.qty) || 0;
          const price = Number(item.price) || 0;
          itemDiscount = (qty * price * Number(item.discountPercentage)) / 100;
        } else if (item.discountAmount) {
          itemDiscount = Number(item.discountAmount) || 0;
        }
        return total + itemDiscount;
      }, 0);
      
      let discountValue = 0;
      if (updateData.discount && !isNaN(Number(updateData.discount))) {
        if (updateData.discountType === '%') {
          discountValue = originalSubTotal * Number(updateData.discount) / 100;
        } else {
          discountValue = Number(updateData.discount);
        }
      }
      
      // Total discount is item discounts + global discount
      const totalDiscount = totalItemDiscount + discountValue;
      
      let taxType = updateData.taxType || '%';
      let tax = updateData.tax || 0;
      let taxValue = 0;
      if (taxType === '%') {
        taxValue = (originalSubTotal - totalDiscount) * Number(tax) / 100;
      } else if (taxType === 'PKR') {
        taxValue = Number(tax);
      }
      const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
  
      // 3. Update party balances based on payment type
      const Party = (await import('../models/parties.js')).default;
      
      // Calculate old and new credit amounts
      const oldCreditAmount = oldSale.paymentType === 'Credit' ? (oldSale.balance || 0) : 0;
      const newCreditAmount = updateData.paymentType === 'Credit' ? (grandTotal - (updateData.received || 0)) : 0;
      
      if (oldSale.partyName !== updateData.partyName) {
        // Old party: minus old credit amount
        const oldParty = await Party.findOne({ name: oldSale.partyName, user: userId });
        if (oldParty) {
          oldParty.openingBalance = (oldParty.openingBalance || 0) - oldCreditAmount;
          await oldParty.save();
        }
        // New party: plus new credit amount
        const newParty = await Party.findOne({ name: updateData.partyName, user: userId });
        if (newParty) {
          newParty.openingBalance = (newParty.openingBalance || 0) + newCreditAmount;
          await newParty.save();
        }
      } else {
        // Same party: adjust by credit amount difference
        const party = await Party.findOne({ name: updateData.partyName, user: userId });
        if (party) {
          party.openingBalance = (party.openingBalance || 0) - oldCreditAmount + newCreditAmount;
          await party.save();
        }
      }
  
      // 4. Update sale
      // Calculate new balance
      let received = typeof updateData.received === 'number' ? updateData.received : (oldSale.received || 0);
      const balance = grandTotal - received;
      const sale = await Sale.findOneAndUpdate(
        { _id: saleId, userId },
        { ...updateData, grandTotal, balance, discountValue: totalDiscount, updatedAt: new Date() },
        { new: true }
      );
      if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
      clearAllCacheForUser(userId); // Invalidate all related caches
      res.json({ success: true, data: sale });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
  