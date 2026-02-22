/**
 * Fix Question 162 in Production Database
 *
 * This script updates question 162 to ensure option F exists
 * and all options are properly separated.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixQuestion162() {
  const questionId = 162

  console.log(`Checking question ${questionId} in database...`)

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      options: true,
      correct_answers: true,
    },
  })

  if (!existing) {
    console.error(`Question ${questionId} not found!`)
    return
  }

  console.log('Current options in database:')
  console.log(JSON.stringify(existing.options, null, 2))
  console.log('Current correct_answers:', existing.correct_answers)

  // Fixed options for question 162
  const fixedOptions = {
    "A": "Inform other banks in the same geographical area to freeze the client's assets if they are a member of that bank, too.",
    "B": "Extend the account and asset freeze to the client's family members as a precautionary measure.",
    "C": "Ensure the client and beneficiaries are unable to access any frozen assets during the freeze order.",
    "D": "The institution does not need to comply with the request if the client's assets make the task unusually difficult or complex to access",
    "E": "An affidavit must accompany the freeze order for the bank to comply with the request.",
    "F": "The institution should obtain a copy of the court order to freeze the assets of the named individuals."
  }

  // Check if options need fixing
  const optionsAsRecord = existing.options as Record<string, unknown>
  const needsFix = typeof existing.options === 'object' && existing.options !== null &&
                    (Object.keys(fixedOptions).some(key => !(key in optionsAsRecord)) ||
                     JSON.stringify(existing.options) !== JSON.stringify(fixedOptions))

  if (!needsFix) {
    console.log('✅ Question 162 is already correct!')
    return
  }

  console.log('\n⚠️  Question 162 needs to be fixed!')
  console.log('\nUpdating question 162...')

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      options: fixedOptions,
    },
  })

  console.log('\n✅ Updated question 162!')
  console.log('\nNew options:')
  console.log(JSON.stringify(updated.options, null, 2))
}

async function main() {
  try {
    await fixQuestion162()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
