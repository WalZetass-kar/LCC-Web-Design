import { describe, it, expect } from 'vitest'
import { validateData, productSchema, sanitizeString } from '../src/shared/validation'

describe('Validation', () => {
  describe('productSchema', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        kd_barang: 'P001',
        nama_barang: 'Test Product',
        stok: 10,
        harga_barang: 50000,
        harga_modal: 30000,
        potongan: 10,
        kd_kategori_barang: 1,
        kd_satuan: 1,
      }

      const result = validateData(productSchema, validProduct)
      expect(result.success).toBe(true)
    })

    it('should reject invalid product data', () => {
      const invalidProduct = {
        kd_barang: '',
        nama_barang: '',
        stok: -1,
        harga_barang: -100,
      }

      const result = validateData(productSchema, invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })

    it('should reject discount over 100%', () => {
      const product = {
        kd_barang: 'P001',
        nama_barang: 'Test',
        stok: 10,
        harga_barang: 50000,
        harga_modal: 30000,
        potongan: 150,
        kd_kategori_barang: 1,
        kd_satuan: 1,
      }

      const result = validateData(productSchema, product)
      expect(result.success).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const output = sanitizeString(input)
      expect(output).not.toContain('<')
      expect(output).not.toContain('>')
    })

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")'
      const output = sanitizeString(input)
      expect(output).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")'
      const output = sanitizeString(input)
      expect(output).not.toContain('onclick=')
    })
  })
})
