import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/utils/api'

export const useEnterpriseStore = defineStore('enterprise', () => {
  const enterprises = ref([])
  const currentEnterprise = ref(null)
  const loading = ref(false)
  
  const fetchEnterprises = async () => {
    loading.value = true
    try {
      const res = await api.getEnterprises()
      enterprises.value = res.enterprises || []
    } catch (e) {
      console.error('获取企业列表失败:', e)
    } finally {
      loading.value = false
    }
  }
  
  const fetchEnterprise = async (code) => {
    loading.value = true
    try {
      const res = await api.getEnterprise(code)
      currentEnterprise.value = res.enterprise
      return res.enterprise
    } catch (e) {
      console.error('获取企业详情失败:', e)
      return null
    } finally {
      loading.value = false
    }
  }
  
  const createEnterprise = async (data) => {
    try {
      const res = await api.createEnterprise(data)
      await fetchEnterprises()
      return res
    } catch (e) {
      console.error('创建企业失败:', e)
      throw e
    }
  }
  
  const updateEnterprise = async (code, data) => {
    try {
      const res = await api.updateEnterprise(code, data)
      await fetchEnterprises()
      return res
    } catch (e) {
      console.error('更新企业失败:', e)
      throw e
    }
  }
  
  const deleteEnterprise = async (code) => {
    try {
      await api.deleteEnterprise(code)
      await fetchEnterprises()
    } catch (e) {
      console.error('删除企业失败:', e)
      throw e
    }
  }
  
  return {
    enterprises,
    currentEnterprise,
    loading,
    fetchEnterprises,
    fetchEnterprise,
    createEnterprise,
    updateEnterprise,
    deleteEnterprise
  }
})
