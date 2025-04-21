import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "@/components/ui/star-rating"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

// Sample review data with updated avatar paths
const reviews = [
  {
    id: 1,
    user: {
      name: "Amadou Diallo",
      avatar: "/images/amadou_diallo.jpg",
    },
    rating: 5,
    date: new Date(2023, 3, 15),
    title: "Excellent quality grain",
    content:
      "The fonio grain I received was of excellent quality. Very clean and well-packaged. It cooks quickly and has a delicious nutty flavor. Will definitely order again!",
  },
  {
    id: 2,
    user: {
      name: "Fatima Ouedraogo",
      avatar: "/images/fatima_ouderaogo.jpg",
    },
    rating: 4,
    date: new Date(2023, 3, 20),
    title: "Good product, fast delivery",
    content:
      "The quality of the grain is good, and the delivery was faster than expected. I would have given 5 stars, but the packaging could be improved to better preserve freshness during storage.",
  },
  {
    id: 3,
    user: {
      name: "Ibrahim Maiga",
      avatar: "/images/ibrahim_maiga.jpg",
    },
    rating: 5,
    date: new Date(2023, 4, 2),
    title: "Traditional quality",
    content:
      "This reminds me of the fonio my grandmother used to prepare. Authentic taste and excellent nutritional value. I appreciate that it's organically grown using traditional methods.",
  },
]

// Rating distribution
const ratingDistribution = {
  5: 18,
  4: 7,
  3: 2,
  2: 1,
  1: 0,
}

const totalReviews = Object.values(ratingDistribution).reduce((a, b) => a + b, 0)

export function ProductReviews({ productId }: { productId: string }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-bold">4.5</div>
            <div className="flex justify-center mt-2">
              <StarRating rating={4.5} size="lg" />
            </div>
            <div className="text-sm text-muted-foreground mt-1">Based on {totalReviews} reviews</div>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating as keyof typeof ratingDistribution]
              const percentage = (count / totalReviews) * 100

              return (
                <div key={rating} className="flex items-center gap-2">
                  <div className="w-12 text-sm">{rating} stars</div>
                  <div className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-accent" style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="w-12 text-sm text-right">{count}</div>
                </div>
              )
            })}
          </div>

          <Button className="w-full hover:bg-accent hover:text-accent-foreground">Write a Review</Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="space-y-2 pb-6 border-b last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={review.user.avatar || "/placeholder.svg"} alt={review.user.name} />
                    <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{review.user.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(review.date)}</div>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>
              <div>
                <h4 className="font-semibold">{review.title}</h4>
                <p className="text-sm mt-1">{review.content}</p>
              </div>
              <div className="flex gap-4 pt-2">
                <Button variant="ghost" size="sm" className="hover:text-accent">
                  Helpful
                </Button>
                <Button variant="ghost" size="sm" className="hover:text-accent">
                  Report
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full hover:text-accent">
            Load More Reviews
          </Button>
        </div>
      </div>
    </div>
  )
}