import React, { useEffect, useState } from 'react'
import axiosInstance from '../../utils/axiosInstance'
import { toast } from 'react-toastify'

const SavedComparisons = () => {
  const [comparisons, setComparisons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavedComparisons()
  }, [])

  const fetchSavedComparisons = async () => {
    try {
      const response = await axiosInstance.get('/compare/saved')
      setComparisons(response.data.data)
    } catch (error) {
      toast.error('Failed to load saved comparisons')
    } finally {
      setLoading(false)
    }
  }

  const deleteComparison = async (id) => {
    if (!confirm('Are you sure you want to delete this comparison?')) return

    try {
      await axiosInstance.delete(`/compare/saved/${id}`)
      setComparisons(comparisons.filter(c => c._id !== id))
      toast.success('Comparison deleted')
    } catch (error) {
      toast.error('Failed to delete comparison')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 text-3xl font-bold text-white md:text-4xl">Saved Comparisons</h2>
          <div className="py-10 text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-2 text-3xl font-bold text-white md:text-4xl">Saved Comparisons</h2>
        <p className="mb-6 text-slate-300">Your saved car comparisons for quick reference.</p>

        {comparisons.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400">No saved comparisons yet.</p>
            <p className="text-slate-500 text-sm">Compare cars and save them for later!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comparisons.map((comparison) => (
              <div key={comparison._id} className="rounded-2xl border border-white/10 bg-slate-900/88 p-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{comparison.name}</h3>
                  <button
                    onClick={() => deleteComparison(comparison._id)}
                    className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>

                <div className="mb-4 text-sm text-slate-400">
                  Saved on {new Date(comparison.createdAt).toLocaleDateString()}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {comparison.cars.map((car, index) => (
                    <div key={index} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                      <h4 className="font-semibold text-white">{car.name}</h4>
                      <p className="text-sm text-slate-400">{car.brand}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Price: <span className="font-semibold text-white">Rs {Number(car.price || 0).toLocaleString('en-IN')}</span></p>
                        <p>Mileage: <span className="font-semibold text-white">{car.mileage || 0} kmpl</span></p>
                        <p>Rating: <span className="font-semibold text-white">{car.rating || 0}/5</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SavedComparisons