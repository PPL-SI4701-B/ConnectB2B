'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  maxStars?: number;
  size?: number; // width and height in px
}

export default function StarRating({
  rating,
  onChange,
  readonly = false,
  maxStars = 5,
  size = 24
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleStarClick = (selectedRating: number) => {
    if (!readonly && onChange) {
      onChange(selectedRating);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!readonly) {
      setHoverRating(index);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(null);
    }
  };

  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = hoverRating !== null ? starValue <= hoverRating : starValue <= rating;

        return (
          <button
            key={index}
            type="button"
            disabled={readonly}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            className={`transition-all duration-150 ${
              readonly 
                ? 'cursor-default' 
                : 'hover:scale-110 cursor-pointer focus:outline-none'
            }`}
            style={{ width: size, height: size }}
          >
            <Star
              size={size}
              className={`transition-colors ${
                isFilled
                  ? 'fill-warning text-warning'
                  : 'text-gray-200'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
