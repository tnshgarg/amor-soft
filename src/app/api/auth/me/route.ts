import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-middleware'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get or create user profile
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // User profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user profile:', createError)
        throw new Error('Failed to create user profile')
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newProfile.id,
          email: newProfile.email,
          created_at: newProfile.created_at
        }
      })
    }

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to fetch user profile')
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at
      }
    })

  } catch (error) {
    console.error('Error in auth/me:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get user information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
